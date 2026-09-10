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
