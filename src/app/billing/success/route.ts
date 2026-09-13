import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

import { chargeBilling, issueBillingKey } from "@/lib/billing/toss-client";
import { reconcileChannelLocks } from "@/lib/db/queries/channels";
import {
  createSubscription,
  getSubscriptionByUserId,
  PLAN_CHANNEL_LIMITS,
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

  // 이미 활성 구독 중인 유저가 체크아웃 플로우를 다시 타면 이중 청구가 될 수
  // 있다 — Fix 2 이후 UI에서는 도달하지 않지만 라우트 레벨에서도 방어한다.
  const existingSubscription = await getSubscriptionByUserId(user.id);
  if (existingSubscription?.status === "active") {
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
    await reconcileChannelLocks(user.id, PLAN_CHANNEL_LIMITS[plan]);
  } catch (e) {
    console.error("구독 최초 가입 실패:", e);
    return NextResponse.redirect(`${origin}/billing/fail`);
  }

  redirect("/mypage/subscription?success=1");
}
