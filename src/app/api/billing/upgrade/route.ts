import { NextResponse } from "next/server";
import { z } from "zod";

import { chargeBilling } from "@/lib/billing/toss-client";
import { reconcileChannelLocks } from "@/lib/db/queries/channels";
import {
  applySuccessfulRenewal,
  getSubscriptionByUserId,
  PLAN_CHANNEL_LIMITS,
  PLAN_LABELS,
  PLAN_ORDER,
  PLAN_PRICES,
  recordPaymentHistory,
} from "@/lib/db/queries/subscriptions";
import { createClient } from "@/lib/supabase/server";

const BodySchema = z.object({
  plan: z.enum(["basic", "plus", "pro"]),
});

// 이미 활성 구독 중인 유저의 즉시 업그레이드 — 등록된 빌링키로 새 플랜 정가를
// 바로 청구하고, 결제 주기를 오늘부터 한 달로 초기화한다(차액 정산 없음).
export async function POST(request: Request) {
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

  const { plan } = body.data;
  const subscription = await getSubscriptionByUserId(user.id);

  if (
    !subscription ||
    subscription.status !== "active" ||
    !subscription.billingKey ||
    !subscription.tossCustomerKey
  ) {
    return NextResponse.json(
      { error: "즉시 결제할 수 있는 등록된 구독이 없습니다." },
      { status: 400 },
    );
  }

  if (PLAN_ORDER[plan] <= PLAN_ORDER[subscription.plan]) {
    return NextResponse.json(
      { error: "업그레이드는 현재보다 상위 플랜만 가능합니다." },
      { status: 400 },
    );
  }

  const amount = PLAN_PRICES[plan];
  const chargeResult = await chargeBilling({
    billingKey: subscription.billingKey,
    customerKey: subscription.tossCustomerKey,
    amount,
    orderId: crypto.randomUUID(),
    orderName: `Reevely ${PLAN_LABELS[plan]} 구독 (업그레이드)`,
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
    return NextResponse.json(
      { error: `결제에 실패했습니다. (${chargeResult.failReason})` },
      { status: 402 },
    );
  }

  const nextBillingDate = new Date();
  nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
  await applySuccessfulRenewal(user.id, plan, nextBillingDate);
  await reconcileChannelLocks(user.id, PLAN_CHANNEL_LIMITS[plan]);

  return NextResponse.json({ ok: true });
}
