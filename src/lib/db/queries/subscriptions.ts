import "server-only";

import { and, eq, lte } from "drizzle-orm";

import { decrypt, encrypt } from "@/lib/crypto/token-cipher";
import { db } from "@/lib/db";
import { paymentHistory, paymentStatusEnum, subscriptions } from "@/lib/db/schema";

export type SubscriptionPlan = "basic" | "plus" | "pro";

export const PLAN_PRICES: Record<SubscriptionPlan, number> = {
  basic: 19900,
  plus: 39900,
  pro: 69900,
};

export const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  basic: "베이직",
  plus: "플러스",
  pro: "프로",
};

export const PLAN_CHANNEL_LIMITS: Record<SubscriptionPlan, number> = {
  basic: 1,
  plus: 2,
  pro: 3,
};

export const FREE_CHANNEL_LIMIT = 1;

// sync 1회당 모니터링하는 영상 수 상한. pro는 null(진짜 무제한 — 재생목록을 끝까지
// 페이지네이션한다. 영상이 아주 많은 채널은 sync당 API 쿼터를 많이 쓰게 됨).
export const PLAN_VIDEO_LIMITS: Record<SubscriptionPlan, number | null> = {
  basic: 50,
  plus: 200,
  pro: null,
};

export const FREE_VIDEO_LIMIT = 10;

// 유저의 현재 플랜 기준 sync당 영상 모니터링 상한 — null이면 무제한
export async function getVideoLimitForUser(userId: string): Promise<number | null> {
  const subscription = await getSubscriptionByUserId(userId);
  return subscription ? PLAN_VIDEO_LIMITS[subscription.plan] : FREE_VIDEO_LIMIT;
}

// 월 댓글 분석량 한도 — 유저가 연동한 채널 전체를 합산한 계정 단위 한도
export const PLAN_MONTHLY_ANALYSIS_LIMITS: Record<SubscriptionPlan, number> = {
  basic: 10000,
  plus: 30000,
  pro: 50000,
};

export const FREE_MONTHLY_ANALYSIS_LIMIT = 1000;

export async function getMonthlyAnalysisLimitForUser(userId: string): Promise<number> {
  const subscription = await getSubscriptionByUserId(userId);
  return subscription
    ? PLAN_MONTHLY_ANALYSIS_LIMITS[subscription.plan]
    : FREE_MONTHLY_ANALYSIS_LIMIT;
}

export async function getSubscriptionByUserId(userId: string) {
  const [row] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  if (!row) return null;
  return { ...row, billingKey: decrypt(row.billingKey) };
}

// 유저의 현재 플랜 기준 채널 연동 한도 — 구독 row가 없으면(무료) FREE_CHANNEL_LIMIT
export async function getChannelLimitForUser(userId: string): Promise<number> {
  const subscription = await getSubscriptionByUserId(userId);
  return subscription ? PLAN_CHANNEL_LIMITS[subscription.plan] : FREE_CHANNEL_LIMIT;
}

type CreateSubscriptionInput = {
  userId: string;
  plan: SubscriptionPlan;
  billingKey: string; // 평문 — 이 함수 안에서 암호화한다
  tossCustomerKey: string;
};

// userId에 unique 제약이 있어, 이미 row가 있으면(예: 해지 유예기간 중 재구독) insert가
// 제약 위반으로 throw한다. 결제는 이미 성공한 뒤이므로 실패시키지 않고 upsert로
// 기존 row를 새 결제 주기로 갱신한다.
export async function createSubscription(input: CreateSubscriptionInput) {
  const now = new Date();
  const nextBillingDate = new Date(now);
  nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

  const values = {
    userId: input.userId,
    plan: input.plan,
    status: "active" as const,
    billingKey: encrypt(input.billingKey),
    tossCustomerKey: input.tossCustomerKey,
    currentPeriodStart: now,
    nextBillingDate,
  };

  await db
    .insert(subscriptions)
    .values(values)
    .onConflictDoUpdate({
      target: subscriptions.userId,
      set: {
        plan: values.plan,
        status: values.status,
        billingKey: values.billingKey,
        tossCustomerKey: values.tossCustomerKey,
        currentPeriodStart: values.currentPeriodStart,
        nextBillingDate: values.nextBillingDate,
        pendingPlan: null,
        updatedAt: new Date(),
      },
    });
}

// 유료 유저의 플랜 변경 예약. 구독 row가 없는(무료) 유저에겐 안 먹힌다 —
// 무료→유료는 체크아웃 플로우(Task 5)를 타야 하므로 false 리턴.
export async function setPendingPlan(userId: string, plan: SubscriptionPlan) {
  const updated = await db
    .update(subscriptions)
    .set({ pendingPlan: plan, updatedAt: new Date() })
    .where(eq(subscriptions.userId, userId))
    .returning({ id: subscriptions.id });

  return updated.length > 0;
}

export async function cancelSubscription(userId: string) {
  const updated = await db
    .update(subscriptions)
    .set({ status: "canceled_pending", updatedAt: new Date() })
    .where(eq(subscriptions.userId, userId))
    .returning({ id: subscriptions.id });

  return updated.length > 0;
}

// 청구 cron 전용 — nextBillingDate가 도래한 구독 전체
export async function getDueSubscriptions(now: Date) {
  const rows = await db
    .select()
    .from(subscriptions)
    .where(lte(subscriptions.nextBillingDate, now));

  return rows.map((row) => ({ ...row, billingKey: decrypt(row.billingKey) }));
}

// 결제 실패(재시도까지 실패) 또는 해지 유예기간 종료 — row 삭제로 무료 전환
export async function deleteSubscription(userId: string) {
  await db.delete(subscriptions).where(eq(subscriptions.userId, userId));
}

// 정기 청구 성공 시 — pendingPlan이 있었으면 그걸로 갈아끼우고 다음 주기로 넘어간다
export async function applySuccessfulRenewal(
  userId: string,
  plan: SubscriptionPlan,
  nextBillingDate: Date,
) {
  await db
    .update(subscriptions)
    .set({
      plan,
      pendingPlan: null,
      status: "active",
      currentPeriodStart: new Date(),
      nextBillingDate,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.userId, userId));
}

// 정기 청구 첫 실패 — nextBillingDate를 재시도 예정일로 재사용
export async function markPaymentFailed(userId: string, retryAt: Date) {
  await db
    .update(subscriptions)
    .set({ status: "payment_failed", nextBillingDate: retryAt, updatedAt: new Date() })
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active")));
}

type RecordPaymentHistoryInput = {
  userId: string;
  plan: SubscriptionPlan;
  amount: number;
  status: (typeof paymentStatusEnum.enumValues)[number];
  tossPaymentKey?: string;
  failReason?: string;
};

export async function recordPaymentHistory(input: RecordPaymentHistoryInput) {
  await db.insert(paymentHistory).values({
    userId: input.userId,
    plan: input.plan,
    amount: input.amount,
    status: input.status,
    tossPaymentKey: input.tossPaymentKey,
    failReason: input.failReason,
  });
}
