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
