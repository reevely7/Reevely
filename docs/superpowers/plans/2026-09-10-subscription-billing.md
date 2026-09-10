# 구독 결제(토스페이먼츠) 코어 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 토스페이먼츠 자동결제(빌링)로 무료/베이직/플러스/프로 구독을 최초 가입 → 플랜 변경 →
해지 → 매달 자동 청구(결제 실패 시 3일 유예 후 재시도)까지 동작하게 만든다.

**Architecture:** 토스 호스팅 카드 등록 인증창으로 빌링키를 발급받아(카드번호 직접 미수집)
`subscriptions` 테이블에 암호화 저장하고, 매일 도는 전용 cron이 `nextBillingDate`가 도래한
구독을 순회하며 토스 정기결제 API(동기 응답)로 청구한다. 플랜 한도 강제(월 댓글 분석량·업데이트
주기 연동)는 이 플랜에 포함하지 않는다 — 다음 단계.

**Tech Stack:** Next.js App Router, Drizzle ORM, Supabase Auth, `@tosspayments/payment-sdk`
(신규 설치), `date-fns`(기존 의존성), 기존 `src/lib/crypto/token-cipher.ts` 재사용.

**Spec:** `docs/superpowers/specs/2026-09-10-subscription-billing-design.md`

## Global Constraints

- App Router만 사용, `pages/` 디렉터리 생성 금지
- DB 접근은 전부 `src/lib/db/queries/*`를 거친다 — 컴포넌트·라우트에서 Drizzle 직접 호출 금지
- Supabase 기본 클라이언트로 DB 쿼리 금지 (Auth 용도로만)
- `any` 타입 금지 (불가피하면 `unknown` + 타입가드)
- 프로덕션 코드(`src/`)에 `console.log` 금지, 에러 로깅은 `console.error`만
  (`scripts/*.ts`는 기존 컨벤션대로 `console.log` 허용)
- 빌링키는 refresh token과 동일하게 암호화 저장 (`src/lib/crypto/token-cipher.ts`의
  `encrypt`/`decrypt` 재사용, 새 암호화 로직 만들지 않음)
- 토스 API 호출은 프로젝트 컨벤션대로 raw `fetch()` 사용 (youtube 연동과 동일하게, 별도 HTTP
  클라이언트 라이브러리 추가 안 함)
- 커밋 전 `npx tsc --noEmit && npm run lint` 통과 확인
- 커밋 메시지: `feat|fix|docs|refactor: 간결한 설명`

---

## Task 1: DB 스키마 — subscriptions / payment_history

**Files:**
- Modify: `src/lib/db/schema.ts`
- Create: 마이그레이션(`npm run db:generate`로 자동 생성, `./drizzle/00XX_*.sql`)

**Interfaces:**
- Produces: `subscriptionPlanEnum`, `subscriptionStatusEnum`, `paymentStatusEnum`, `subscriptions`
  테이블, `paymentHistory` 테이블 — 이후 모든 태스크가 이 스키마를 import해서 쓴다.

- [ ] **Step 1: schema.ts에 enum과 테이블 추가**

`src/lib/db/schema.ts` 맨 끝(`notifications` 테이블 정의 다음)에 추가:

```ts
export const subscriptionPlanEnum = pgEnum("subscription_plan", [
  "basic",
  "plus",
  "pro",
]);
// 무료는 별도 값이 없다 — subscriptions에 row가 없으면 무료로 취급한다.

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active", // 정상 구독 중, nextBillingDate에 정기 청구
  "canceled_pending", // 해지 신청함. 이미 낸 기간은 유지, nextBillingDate에 row 삭제(무료 전환)
  "payment_failed", // 정기 청구 실패, 유예기간 중. nextBillingDate는 재시도 예정일로 재사용됨
]);

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().unique(),
  plan: subscriptionPlanEnum("plan").notNull(),
  // 다음 결제일부터 적용될 플랜 변경 예약. 변경 없으면 null.
  pendingPlan: subscriptionPlanEnum("pending_plan"),
  status: subscriptionStatusEnum("status").notNull().default("active"),
  // 토스 빌링키 — refresh token과 동일하게 암호화 저장 (src/lib/crypto/token-cipher.ts)
  billingKey: text("billing_key").notNull(),
  // 토스 빌링 API가 요구하는 상점 측 고객 식별자. userId를 그대로 사용한다.
  tossCustomerKey: text("toss_customer_key").notNull(),
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true }).notNull(),
  // 정상 상태에선 "다음 정기결제일", payment_failed 상태에선 "재시도 예정일"로 재사용
  nextBillingDate: timestamp("next_billing_date", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const paymentStatusEnum = pgEnum("payment_status", ["succeeded", "failed"]);

// 결제 시도 감사 로그 — 결제 문의 대응, 영수증 표시용
export const paymentHistory = pgTable("payment_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  plan: subscriptionPlanEnum("plan").notNull(),
  amount: integer("amount").notNull(),
  status: paymentStatusEnum("status").notNull(),
  tossPaymentKey: text("toss_payment_key"),
  failReason: text("fail_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 2: 타입체크로 스키마 문법 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: 마이그레이션 생성**

Run: `npm run db:generate`
Expected: `./drizzle/00XX_*.sql`에 `CREATE TYPE subscription_plan`, `CREATE TABLE subscriptions`,
`CREATE TABLE payment_history` 문이 포함된 새 파일 생성됨

- [ ] **Step 4: 마이그레이션 적용**

Run: `npm run db:migrate`
Expected: 에러 없이 완료. `npm run db:studio`로 `subscriptions`/`payment_history` 테이블이
보이는지 확인 (선택)

- [ ] **Step 5: 커밋**

```bash
git add src/lib/db/schema.ts drizzle/
git commit -m "feat: 구독/결제 이력 스키마 추가"
```

---

## Task 2: 토스페이먼츠 API 클라이언트

**Files:**
- Create: `src/lib/billing/toss-client.ts`

**Interfaces:**
- Consumes: `process.env.TOSS_SECRET_KEY`
- Produces:
  - `issueBillingKey(authKey: string, customerKey: string): Promise<{ billingKey: string }>`
  - `chargeBilling(params: { billingKey: string; customerKey: string; amount: number; orderId: string; orderName: string }): Promise<TossChargeResult>`
  - `type TossChargeResult = { success: true; tossPaymentKey: string } | { success: false; failReason: string }`
  - 이후 Task 3(cron), Task 5(체크아웃)에서 그대로 가져다 쓴다.

- [ ] **Step 1: 파일 작성**

```ts
import "server-only";

// 토스 API는 시크릿 키 뒤에 ':'을 붙여 base64 인코딩한 값을 Basic 인증으로 쓴다.
function authHeader(): string {
  const secretKey = process.env.TOSS_SECRET_KEY;
  if (!secretKey) {
    throw new Error("TOSS_SECRET_KEY 환경변수가 설정되지 않았습니다.");
  }
  return "Basic " + Buffer.from(`${secretKey}:`).toString("base64");
}

type IssueBillingKeyResponse = {
  billingKey: string;
};

// 카드 등록 인증창 완료 후 받은 authKey를 실제 빌링키로 교환한다.
export async function issueBillingKey(
  authKey: string,
  customerKey: string,
): Promise<{ billingKey: string }> {
  const response = await fetch(
    "https://api.tosspayments.com/v1/billing/authorizations/issue",
    {
      method: "POST",
      headers: {
        Authorization: authHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ authKey, customerKey }),
    },
  );

  if (!response.ok) {
    throw new Error(`토스 빌링키 발급 실패 (${response.status})`);
  }

  const data: IssueBillingKeyResponse = await response.json();
  return { billingKey: data.billingKey };
}

export type TossChargeResult =
  | { success: true; tossPaymentKey: string }
  | { success: false; failReason: string };

type TossErrorResponse = { code: string; message: string };

// 빌링키로 실제 결제를 승인(청구)한다. 실패해도 throw하지 않고 결과 타입으로 구분 —
// 호출부(cron/체크아웃)가 payment_history 기록과 상태 전이를 직접 분기해야 하기 때문.
export async function chargeBilling(params: {
  billingKey: string;
  customerKey: string;
  amount: number;
  orderId: string;
  orderName: string;
}): Promise<TossChargeResult> {
  const response = await fetch(
    `https://api.tosspayments.com/v1/billing/${params.billingKey}`,
    {
      method: "POST",
      headers: {
        Authorization: authHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customerKey: params.customerKey,
        amount: params.amount,
        orderId: params.orderId,
        orderName: params.orderName,
        taxFreeAmount: 0,
      }),
    },
  );

  if (!response.ok) {
    const error: TossErrorResponse = await response.json();
    return { success: false, failReason: `${error.code}: ${error.message}` };
  }

  const data: { paymentKey: string; status: string } = await response.json();
  return { success: true, tossPaymentKey: data.paymentKey };
}
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add src/lib/billing/toss-client.ts
git commit -m "feat: 토스페이먼츠 빌링키 발급/청구 API 클라이언트 추가"
```

---

## Task 3: 구독 DB 쿼리

**Files:**
- Create: `src/lib/db/queries/subscriptions.ts`

**Interfaces:**
- Consumes: `subscriptions`, `paymentHistory` 스키마 (Task 1), `encrypt`/`decrypt`
  (`src/lib/crypto/token-cipher.ts`)
- Produces:
  - `type SubscriptionPlan = "basic" | "plus" | "pro"`
  - `PLAN_PRICES: Record<SubscriptionPlan, number>`, `PLAN_LABELS: Record<SubscriptionPlan, string>`
  - `getSubscriptionByUserId(userId): Promise<Subscription | null>`
  - `createSubscription(input): Promise<void>`
  - `setPendingPlan(userId, plan): Promise<boolean>`
  - `cancelSubscription(userId): Promise<boolean>`
  - `getDueSubscriptions(now: Date): Promise<Subscription[]>`
  - `deleteSubscription(userId): Promise<void>`
  - `applySuccessfulRenewal(userId, plan, nextBillingDate): Promise<void>`
  - `markPaymentFailed(userId, retryAt: Date): Promise<void>`
  - `recordPaymentHistory(input): Promise<void>`
  - Task 5(체크아웃)·Task 6(플랜변경/해지)·Task 7(cron)이 전부 이 함수들을 가져다 쓴다.

- [ ] **Step 1: 파일 작성**

```ts
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

export async function getSubscriptionByUserId(userId: string) {
  const [row] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  if (!row) return null;
  return { ...row, billingKey: decrypt(row.billingKey) };
}

type CreateSubscriptionInput = {
  userId: string;
  plan: SubscriptionPlan;
  billingKey: string; // 평문 — 이 함수 안에서 암호화한다
  tossCustomerKey: string;
};

export async function createSubscription(input: CreateSubscriptionInput) {
  const now = new Date();
  const nextBillingDate = new Date(now);
  nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

  await db.insert(subscriptions).values({
    userId: input.userId,
    plan: input.plan,
    status: "active",
    billingKey: encrypt(input.billingKey),
    tossCustomerKey: input.tossCustomerKey,
    currentPeriodStart: now,
    nextBillingDate,
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
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: 검증 스크립트로 실제 DB에 왕복 확인**

`scripts/test-subscriptions.ts` 생성 (기존 `scripts/test-weekly-digest.ts`와 동일한 컨벤션 —
영구 테스트 스위트가 아니라 dotenv로 실제 DB에 직접 왕복하는 수동 확인용 스크립트):

```ts
// subscriptions 쿼리 함수들이 실제 DB에 잘 왕복하는지 확인한다. 끝나면 만든 row를 정리한다.
// 실행: npm run test:subscriptions
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

import { randomUUID } from "node:crypto";

import { db } from "../src/lib/db";
import { subscriptions } from "../src/lib/db/schema";
import {
  cancelSubscription,
  createSubscription,
  getSubscriptionByUserId,
  setPendingPlan,
} from "../src/lib/db/queries/subscriptions";
import { eq } from "drizzle-orm";

async function main() {
  const fakeUserId = randomUUID();

  await createSubscription({
    userId: fakeUserId,
    plan: "basic",
    billingKey: "test-billing-key",
    tossCustomerKey: fakeUserId,
  });
  console.log("생성 완료");

  const created = await getSubscriptionByUserId(fakeUserId);
  console.log("조회 결과:", created?.plan, created?.billingKey);
  if (created?.billingKey !== "test-billing-key") {
    throw new Error("암호화/복호화 왕복이 원본과 다름");
  }

  const pendingOk = await setPendingPlan(fakeUserId, "pro");
  console.log("플랜 변경 예약:", pendingOk);

  const cancelOk = await cancelSubscription(fakeUserId);
  console.log("해지:", cancelOk);

  await db.delete(subscriptions).where(eq(subscriptions.userId, fakeUserId));
  console.log("정리 완료");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

`package.json`의 `scripts`에 추가:
```json
"test:subscriptions": "tsx --conditions=react-server --env-file=.env.local scripts/test-subscriptions.ts"
```

Run: `npm run test:subscriptions`
Expected: `암호화/복호화 왕복이 원본과 다름` 에러 없이 "생성 완료" → "조회 결과: basic
test-billing-key" → "플랜 변경 예약: true" → "해지: true" → "정리 완료" 순서로 출력

- [ ] **Step 4: 커밋**

```bash
git add src/lib/db/queries/subscriptions.ts scripts/test-subscriptions.ts package.json
git commit -m "feat: 구독 DB 쿼리 함수 추가"
```

---

## Task 4: 결제 실패 알림 타입 추가

**Files:**
- Modify: `src/lib/db/schema.ts`
- Modify: `src/lib/db/queries/notifications.ts`

**Interfaces:**
- Consumes: 없음
- Produces: `notifyPaymentFailed(userId, retryAt: Date): Promise<void>`,
  `notifyPaymentDowngraded(userId): Promise<void>` — Task 7(cron)이 사용한다.

- [ ] **Step 1: notificationTypeEnum에 두 값 추가**

`src/lib/db/schema.ts`의 `notificationTypeEnum` 배열 끝에 추가:

```ts
export const notificationTypeEnum = pgEnum("notification_type", [
  "new_comment",
  "repeat_author",
  "review_backlog",
  "video_spike",
  "weekly_digest",
  "payment_failed", // 정기 결제 실패, 유예기간 시작
  "payment_downgraded", // 재시도까지 실패해 무료로 전환됨
]);
```

- [ ] **Step 2: 마이그레이션 생성 및 적용**

Run: `npm run db:generate && npm run db:migrate`
Expected: enum에 값 2개 추가하는 마이그레이션 파일 생성 및 적용 완료

- [ ] **Step 3: notifications.ts에 헬퍼 함수 추가**

`src/lib/db/queries/notifications.ts` 상단 `NotificationType` 유니온에 두 값 추가:

```ts
type NotificationType =
  | "new_comment"
  | "repeat_author"
  | "review_backlog"
  | "video_spike"
  | "weekly_digest"
  | "payment_failed"
  | "payment_downgraded";
```

파일 끝(`deleteNotificationsByUserId` 앞)에 추가:

```ts
function formatDate(date: Date): string {
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

export async function notifyPaymentFailed(userId: string, retryAt: Date) {
  await db.insert(notifications).values({
    userId,
    type: "payment_failed",
    title: "결제에 실패했어요",
    message: `카드 결제가 실패했습니다. ${formatDate(retryAt)}에 다시 시도됩니다. 카드 정보를 확인해 주세요.`,
    href: "/mypage/subscription",
  });
}

export async function notifyPaymentDowngraded(userId: string) {
  await db.insert(notifications).values({
    userId,
    type: "payment_downgraded",
    title: "무료 플랜으로 전환되었습니다",
    message: "재시도 결제도 실패해 무료 플랜으로 전환됐어요. 다시 구독하려면 결제 정보를 등록해 주세요.",
    href: "/mypage/subscription",
  });
}
```

- [ ] **Step 4: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 5: 커밋**

```bash
git add src/lib/db/schema.ts src/lib/db/queries/notifications.ts drizzle/
git commit -m "feat: 결제 실패/다운그레이드 알림 타입 추가"
```

---

## Task 5: 최초 가입 체크아웃 플로우

**Files:**
- Create: `src/components/mypage/plan-checkout-button.tsx`
- Create: `src/app/billing/success/route.ts`
- Create: `src/app/billing/fail/page.tsx`
- Modify: `package.json` (의존성 추가)

**Interfaces:**
- Consumes: `issueBillingKey`, `chargeBilling` (Task 2), `createSubscription`,
  `recordPaymentHistory`, `PLAN_PRICES`, `PLAN_LABELS`, `SubscriptionPlan` (Task 3)
- Produces: `<PlanCheckoutButton plan={plan} userId={userId} />` 컴포넌트 — Task 8(마이페이지
  화면)이 이걸 가져다 쓴다.

- [ ] **Step 1: 토스 결제 SDK 설치**

Run: `npm install @tosspayments/payment-sdk`
Expected: `package.json`의 `dependencies`에 `@tosspayments/payment-sdk` 추가됨

- [ ] **Step 2: 체크아웃 버튼 컴포넌트 작성**

```tsx
"use client";

import { loadTossPayments } from "@tosspayments/payment-sdk";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { SubscriptionPlan } from "@/lib/db/queries/subscriptions";

export function PlanCheckoutButton({
  plan,
  userId,
  label,
}: {
  plan: SubscriptionPlan;
  userId: string;
  label: string;
}) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick() {
    setIsLoading(true);
    try {
      const tossPayments = await loadTossPayments(
        process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!,
      );
      await tossPayments.requestBillingAuth("카드", {
        customerKey: userId,
        successUrl: `${window.location.origin}/billing/success?plan=${plan}`,
        failUrl: `${window.location.origin}/billing/fail`,
      });
    } catch {
      // 사용자가 인증창을 직접 닫은 경우 등 — 별도 에러 표시 없이 버튼만 복구
      setIsLoading(false);
    }
  }

  return (
    <Button type="button" onClick={handleClick} disabled={isLoading}>
      {isLoading ? "이동 중…" : label}
    </Button>
  );
}
```

- [ ] **Step 3: /billing/success 콜백 라우트 작성**

```ts
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

import { chargeBilling, issueBillingKey } from "@/lib/billing/toss-client";
import {
  createSubscription,
  PLAN_LABELS,
  PLAN_PRICES,
  recordPaymentHistory,
  type SubscriptionPlan,
} from "@/lib/db/queries/subscriptions";
import { createClient } from "@/lib/supabase/server";

const VALID_PLANS: readonly SubscriptionPlan[] = ["basic", "plus", "pro"];

function isSubscriptionPlan(value: string | null): value is SubscriptionPlan {
  return VALID_PLANS.includes(value as SubscriptionPlan);
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const authKey = searchParams.get("authKey");
  const customerKey = searchParams.get("customerKey");
  const plan = searchParams.get("plan");

  if (!authKey || !customerKey || !isSubscriptionPlan(plan)) {
    return NextResponse.redirect(`${origin}/billing/fail`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== customerKey) {
    return NextResponse.redirect(`${origin}/billing/fail`);
  }

  try {
    const { billingKey } = await issueBillingKey(authKey, customerKey);
    const amount = PLAN_PRICES[plan];

    const chargeResult = await chargeBilling({
      billingKey,
      customerKey,
      amount,
      orderId: crypto.randomUUID(),
      orderName: `Reevely ${PLAN_LABELS[plan]} 구독`,
    });

    await recordPaymentHistory({
      userId: user.id,
      plan,
      amount,
      status: chargeResult.success ? "succeeded" : "failed",
      tossPaymentKey: chargeResult.success ? chargeResult.tossPaymentKey : undefined,
      failReason: chargeResult.success ? undefined : chargeResult.failReason,
    });

    if (!chargeResult.success) {
      return NextResponse.redirect(`${origin}/billing/fail`);
    }

    await createSubscription({
      userId: user.id,
      plan,
      billingKey,
      tossCustomerKey: customerKey,
    });
  } catch (e) {
    console.error("구독 최초 가입 실패:", e);
    return NextResponse.redirect(`${origin}/billing/fail`);
  }

  redirect("/mypage/subscription?success=1");
}
```

- [ ] **Step 4: /billing/fail 페이지 작성**

```tsx
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function BillingFailPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <p className="text-lg font-semibold text-foreground">결제에 실패했어요</p>
      <p className="text-sm text-muted-foreground">
        카드 인증이나 결제 승인이 완료되지 않았습니다. 다시 시도해 주세요.
      </p>
      <Button asChild>
        <Link href="/mypage/subscription">구독 관리로 돌아가기</Link>
      </Button>
    </main>
  );
}
```

- [ ] **Step 5: 타입체크 및 린트**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음

- [ ] **Step 6: 커밋**

```bash
git add src/components/mypage/plan-checkout-button.tsx src/app/billing package.json package-lock.json
git commit -m "feat: 구독 최초 가입 체크아웃 플로우 추가"
```

---

## Task 6: 플랜 변경 / 해지 API

**Files:**
- Create: `src/app/api/billing/plan/route.ts`
- Create: `src/app/api/billing/cancel/route.ts`

**Interfaces:**
- Consumes: `setPendingPlan`, `cancelSubscription` (Task 3)
- Produces: `PATCH /api/billing/plan`, `POST /api/billing/cancel` — Task 8(마이페이지 화면)이
  fetch로 호출한다.

- [ ] **Step 1: 플랜 변경 라우트 작성**

```ts
import { NextResponse } from "next/server";
import { z } from "zod";

import { setPendingPlan } from "@/lib/db/queries/subscriptions";
import { createClient } from "@/lib/supabase/server";

const BodySchema = z.object({
  plan: z.enum(["basic", "plus", "pro"]),
});

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = BodySchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const ok = await setPendingPlan(user.id, body.data.plan);
  if (!ok) {
    return NextResponse.json(
      { error: "구독 중인 플랜이 없습니다. 먼저 결제를 진행해 주세요." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: 해지 라우트 작성**

```ts
import { NextResponse } from "next/server";

import { cancelSubscription } from "@/lib/db/queries/subscriptions";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const ok = await cancelSubscription(user.id);
  if (!ok) {
    return NextResponse.json(
      { error: "구독 중인 플랜이 없습니다." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: 타입체크 및 린트**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add src/app/api/billing
git commit -m "feat: 플랜 변경/해지 API 추가"
```

---

## Task 7: 자동 청구 cron

**Files:**
- Create: `src/app/api/cron/process-billing/route.ts`
- Modify: `vercel.json`
- Create: `scripts/test-billing-cron.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `getDueSubscriptions`, `deleteSubscription`, `applySuccessfulRenewal`,
  `markPaymentFailed`, `recordPaymentHistory`, `PLAN_PRICES`, `PLAN_LABELS` (Task 3),
  `chargeBilling` (Task 2), `notifyPaymentFailed`, `notifyPaymentDowngraded` (Task 4)
- Produces: `GET /api/cron/process-billing` (CRON_SECRET 인증)

- [ ] **Step 1: cron 라우트 작성**

```ts
import { addDays, addMonths } from "date-fns";
import { NextResponse } from "next/server";

import { chargeBilling } from "@/lib/billing/toss-client";
import {
  applySuccessfulRenewal,
  deleteSubscription,
  getDueSubscriptions,
  markPaymentFailed,
  PLAN_LABELS,
  PLAN_PRICES,
  recordPaymentHistory,
} from "@/lib/db/queries/subscriptions";
import {
  notifyPaymentDowngraded,
  notifyPaymentFailed,
} from "@/lib/db/queries/notifications";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const due = await getDueSubscriptions(now);
  const results = [];

  for (const sub of due) {
    if (sub.status === "canceled_pending") {
      await deleteSubscription(sub.userId);
      results.push({ userId: sub.userId, result: "canceled" });
      continue;
    }

    const targetPlan = sub.pendingPlan ?? sub.plan;
    const amount = PLAN_PRICES[targetPlan];

    let chargeResult;
    try {
      chargeResult = await chargeBilling({
        billingKey: sub.billingKey,
        customerKey: sub.tossCustomerKey,
        amount,
        orderId: crypto.randomUUID(),
        orderName: `Reevely ${PLAN_LABELS[targetPlan]} 구독`,
      });
    } catch (e) {
      console.error(`청구 API 호출 실패 (userId=${sub.userId}):`, e);
      chargeResult = { success: false as const, failReason: "API 호출 실패" };
    }

    await recordPaymentHistory({
      userId: sub.userId,
      plan: targetPlan,
      amount,
      status: chargeResult.success ? "succeeded" : "failed",
      tossPaymentKey: chargeResult.success ? chargeResult.tossPaymentKey : undefined,
      failReason: chargeResult.success ? undefined : chargeResult.failReason,
    });

    if (chargeResult.success) {
      await applySuccessfulRenewal(sub.userId, targetPlan, addMonths(now, 1));
      results.push({ userId: sub.userId, result: "renewed", plan: targetPlan });
      continue;
    }

    if (sub.status === "active") {
      // 첫 실패 — 3일 유예 후 재시도
      const retryAt = addDays(now, 3);
      await markPaymentFailed(sub.userId, retryAt);
      await notifyPaymentFailed(sub.userId, retryAt);
      results.push({ userId: sub.userId, result: "payment_failed_retry_scheduled" });
    } else {
      // payment_failed 상태에서의 재시도도 실패 — 무료 전환
      await deleteSubscription(sub.userId);
      await notifyPaymentDowngraded(sub.userId);
      results.push({ userId: sub.userId, result: "downgraded" });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
```

- [ ] **Step 2: vercel.json에 cron 등록**

```json
{
  "crons": [
    {
      "path": "/api/cron/process-comments",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/process-billing",
      "schedule": "0 3 * * *"
    }
  ]
}
```

(매일 새벽 3시 — 결제는 하루 1회면 충분하고, 분석 cron과 겹치지 않는 시간대로 분리)

- [ ] **Step 3: 수동 검증 스크립트 작성**

`getDueSubscriptions`가 실제로 조건을 걸러내는지 DB 레벨에서 확인 (cron 로직 자체는 fetch로
직접 호출해서 확인 — Step 4 참고):

```ts
// nextBillingDate가 지난 가짜 구독을 만들어 getDueSubscriptions가 잡아내는지 확인하고 정리한다.
// 실행: npm run test:billing-cron
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";

import { db } from "../src/lib/db";
import { subscriptions } from "../src/lib/db/schema";
import { getDueSubscriptions } from "../src/lib/db/queries/subscriptions";
import { encrypt } from "../src/lib/crypto/token-cipher";

async function main() {
  const fakeUserId = randomUUID();
  const past = new Date(Date.now() - 24 * 60 * 60 * 1000);

  await db.insert(subscriptions).values({
    userId: fakeUserId,
    plan: "basic",
    status: "active",
    billingKey: encrypt("test-billing-key"),
    tossCustomerKey: fakeUserId,
    currentPeriodStart: past,
    nextBillingDate: past,
  });

  const due = await getDueSubscriptions(new Date());
  const found = due.find((row) => row.userId === fakeUserId);
  console.log("도래한 구독에 포함됨:", Boolean(found));
  if (!found) throw new Error("getDueSubscriptions가 만료된 구독을 못 찾음");

  await db.delete(subscriptions).where(eq(subscriptions.userId, fakeUserId));
  console.log("정리 완료");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

`package.json`의 `scripts`에 추가:
```json
"test:billing-cron": "tsx --conditions=react-server --env-file=.env.local scripts/test-billing-cron.ts"
```

Run: `npm run test:billing-cron`
Expected: "도래한 구독에 포함됨: true" → "정리 완료"

- [ ] **Step 4: cron 라우트를 실제로 호출해 401/200 확인**

로컬 dev 서버(`npm run dev`)가 떠 있는 상태에서:

```bash
CRON_SECRET=$(grep "^CRON_SECRET=" .env.local | cut -d'=' -f2-)
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/cron/process-billing
curl -s http://localhost:3000/api/cron/process-billing -H "Authorization: Bearer ${CRON_SECRET}"
```

Expected: 첫 호출(인증 헤더 없음)은 `401`, 두 번째 호출은 `{"processed":0,"results":[]}`
(도래한 구독이 없을 때)

- [ ] **Step 5: 타입체크 및 린트**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음

- [ ] **Step 6: 커밋**

```bash
git add src/app/api/cron/process-billing vercel.json scripts/test-billing-cron.ts package.json
git commit -m "feat: 구독 자동 청구 cron 추가"
```

---

## Task 8: 마이페이지 구독 관리 화면

**Files:**
- Create: `src/app/(app)/mypage/subscription/page.tsx`
- Modify: `src/components/mypage/mypage-nav.tsx`
- Create: `src/components/mypage/plan-change-button.tsx`
- Create: `src/components/mypage/cancel-subscription-button.tsx`

**Interfaces:**
- Consumes: `getSubscriptionByUserId`, `PLAN_LABELS`, `PLAN_PRICES` (Task 3),
  `PlanCheckoutButton` (Task 5), `PATCH /api/billing/plan`, `POST /api/billing/cancel` (Task 6)

- [ ] **Step 1: mypage-nav.tsx에 탭 추가**

```ts
const TABS = [
  { href: "/mypage", label: "구독 작성자" },
  { href: "/mypage/subscription", label: "구독 플랜" },
  { href: "/mypage/account", label: "계정/채널" },
  { href: "/mypage/profile", label: "프로필" },
];
```

- [ ] **Step 2: 플랜 변경 버튼 (이미 구독 중인 유저용)**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { SubscriptionPlan } from "@/lib/db/queries/subscriptions";

export function PlanChangeButton({
  plan,
  label,
}: {
  plan: SubscriptionPlan;
  label: string;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick() {
    setIsLoading(true);
    const res = await fetch("/api/billing/plan", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    if (res.ok) {
      router.refresh();
    }
    setIsLoading(false);
  }

  return (
    <Button type="button" variant="outline" onClick={handleClick} disabled={isLoading}>
      {isLoading ? "처리 중…" : label}
    </Button>
  );
}
```

- [ ] **Step 3: 해지 버튼**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function CancelSubscriptionButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick() {
    if (!confirm("구독을 해지하시겠습니까? 이미 낸 기간까지는 그대로 이용할 수 있어요.")) {
      return;
    }
    setIsLoading(true);
    const res = await fetch("/api/billing/cancel", { method: "POST" });
    if (res.ok) {
      router.refresh();
    }
    setIsLoading(false);
  }

  return (
    <Button type="button" variant="outline" onClick={handleClick} disabled={isLoading}>
      {isLoading ? "처리 중…" : "구독 해지"}
    </Button>
  );
}
```

- [ ] **Step 4: 구독 관리 페이지 작성**

```tsx
import { redirect } from "next/navigation";

import { CancelSubscriptionButton } from "@/components/mypage/cancel-subscription-button";
import { MypageNav } from "@/components/mypage/mypage-nav";
import { PlanChangeButton } from "@/components/mypage/plan-change-button";
import { PlanCheckoutButton } from "@/components/mypage/plan-checkout-button";
import {
  getSubscriptionByUserId,
  PLAN_LABELS,
  PLAN_PRICES,
  type SubscriptionPlan,
} from "@/lib/db/queries/subscriptions";
import { createClient } from "@/lib/supabase/server";

const ALL_PLANS: SubscriptionPlan[] = ["basic", "plus", "pro"];

export default async function MypageSubscriptionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const subscription = await getSubscriptionByUserId(user.id);

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8 sm:px-10">
      <header>
        <p className="text-xl font-semibold tracking-tight text-foreground">
          마이페이지
        </p>
        <p className="text-xs text-muted-foreground">
          구독 플랜을 확인하고 변경할 수 있습니다.
        </p>
      </header>

      <MypageNav />

      <section className="space-y-3 rounded-2xl bg-card px-5 py-4">
        <h2 className="text-sm font-medium text-card-foreground">현재 플랜</h2>
        <p className="text-sm text-muted-foreground">
          {subscription
            ? `${PLAN_LABELS[subscription.plan]} (월 ${PLAN_PRICES[subscription.plan].toLocaleString()}원)${
                subscription.status === "canceled_pending"
                  ? " — 해지 예약됨, 남은 기간 동안 이용 가능"
                  : subscription.status === "payment_failed"
                    ? " — 결제 실패, 재시도 예정"
                    : ""
              }${
                subscription.pendingPlan
                  ? ` · 다음 결제일부터 ${PLAN_LABELS[subscription.pendingPlan]}(으)로 변경 예정`
                  : ""
              }`
            : "무료 플랜"}
        </p>
        {subscription && subscription.status === "active" && (
          <CancelSubscriptionButton />
        )}
      </section>

      <section className="space-y-3 rounded-2xl bg-card px-5 py-4">
        <h2 className="text-sm font-medium text-card-foreground">플랜 선택</h2>
        <div className="flex flex-wrap gap-3">
          {ALL_PLANS.map((plan) =>
            subscription ? (
              <PlanChangeButton
                key={plan}
                plan={plan}
                label={`${PLAN_LABELS[plan]}로 변경`}
              />
            ) : (
              <PlanCheckoutButton
                key={plan}
                plan={plan}
                userId={user.id}
                label={`${PLAN_LABELS[plan]} 시작하기`}
              />
            ),
          )}
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 5: 타입체크 및 린트**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음

- [ ] **Step 6: 브라우저로 실제 확인**

`npm run dev` 후 로그인 상태로 `/mypage/subscription` 접속:
- 무료 상태에서 플랜 버튼 클릭 → 토스 카드 등록 인증창으로 이동하는지 확인
- (테스트 카드로 등록 완료 후) `/billing/success`를 거쳐 "현재 플랜"에 반영되는지 확인
- 플랜 변경/해지 버튼이 동작하는지 확인

- [ ] **Step 7: 커밋**

```bash
git add src/app/\(app\)/mypage/subscription src/components/mypage
git commit -m "feat: 마이페이지 구독 관리 화면 추가"
```

---

## Self-Review 메모

- **스펙 커버리지**: 스펙의 스키마(Task 1)·최초가입(Task 5)·플랜변경/해지(Task 6)·자동청구
  cron·유예재시도(Task 7)·notifications 재사용(Task 4) 전부 태스크로 매핑됨. 한도 강제(월
  댓글 분석량, 업데이트 주기)는 스펙에서도 명시적으로 다음 단계로 뺀 부분이라 이 계획엔 없음.
- **타입 일관성**: `SubscriptionPlan`은 Task 3에서 정의되고 이후 모든 태스크가 동일하게
  import해서 쓴다. `TossChargeResult`도 Task 2에서 한 번만 정의.
- **범위**: 결제/구독 코어 단일 서브시스템으로 한 번의 계획에 담을 만한 크기.
