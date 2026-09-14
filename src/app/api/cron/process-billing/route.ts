import { addDays, addMonths } from "date-fns";
import { NextResponse } from "next/server";

import { chargeBilling } from "@/lib/billing/toss-client";
import { reconcileChannelLocks } from "@/lib/db/queries/channels";
import {
  applySuccessfulRenewal,
  deleteSubscription,
  FREE_CHANNEL_LIMIT,
  getDueSubscriptions,
  markPaymentFailed,
  PLAN_CHANNEL_LIMITS,
  PLAN_LABELS,
  PLAN_PRICES,
  recordPaymentHistory,
} from "@/lib/db/queries/subscriptions";
import {
  notifyPaymentDowngraded,
  notifyPaymentFailed,
} from "@/lib/db/queries/notifications";

// Vercel Fluid Compute 기본 300초 한도까지 명시적으로 확보
export const maxDuration = 300;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const due = await getDueSubscriptions(now);
  const results = [];

  for (const sub of due) {
    try {
      if (sub.status === "canceled_pending") {
        await deleteSubscription(sub.userId);
        await reconcileChannelLocks(sub.userId, FREE_CHANNEL_LIMIT);
        results.push({ userId: sub.userId, result: "canceled" });
        continue;
      }

      // 관리자가 부여한 프로모션 구독은 결제수단이 없다 — 만료일이 되면
      // 결제를 시도하지 않고 그냥 무료로 전환한다
      const { billingKey, tossCustomerKey } = sub;
      if (sub.isPromotional || !billingKey || !tossCustomerKey) {
        if (!sub.isPromotional) {
          console.error(`[cron] 실결제 구독인데 billingKey 없음 (userId=${sub.userId})`);
        }
        await deleteSubscription(sub.userId);
        await reconcileChannelLocks(sub.userId, FREE_CHANNEL_LIMIT);
        results.push({
          userId: sub.userId,
          result: sub.isPromotional ? "promotional_expired" : "error",
        });
        continue;
      }

      const targetPlan = sub.pendingPlan ?? sub.plan;
      const amount = PLAN_PRICES[targetPlan];
      // 같은 유저·같은 결제월에는 항상 동일한 orderId를 쓴다 — 청구 성공 후
      // 후속 처리(recordPaymentHistory/applySuccessfulRenewal 등)가 실패해
      // nextBillingDate가 갱신되지 않은 채로 다음 cron 실행이 재시도하더라도,
      // 토스가 orderId 중복을 거부/dedupe해서 같은 달에 이중 청구되는 걸 막아준다.
      const orderId = `${sub.userId}-${now.toISOString().slice(0, 7)}`;

      let chargeResult;
      try {
        chargeResult = await chargeBilling({
          billingKey,
          customerKey: tossCustomerKey,
          amount,
          orderId,
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
        await reconcileChannelLocks(sub.userId, PLAN_CHANNEL_LIMITS[targetPlan]);
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
        await reconcileChannelLocks(sub.userId, FREE_CHANNEL_LIMIT);
        await notifyPaymentDowngraded(sub.userId);
        results.push({ userId: sub.userId, result: "downgraded" });
      }
    } catch (e) {
      console.error(`청구 cron 처리 실패 (userId=${sub.userId}):`, e);
      results.push({ userId: sub.userId, result: "error" });
      continue;
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
