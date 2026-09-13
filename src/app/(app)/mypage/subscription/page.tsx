import { redirect } from "next/navigation";

import { CancelSubscriptionButton } from "@/components/mypage/cancel-subscription-button";
import { MypageNav } from "@/components/mypage/mypage-nav";
import { PlanChangeButton } from "@/components/mypage/plan-change-button";
import { PlanCheckoutButton } from "@/components/mypage/plan-checkout-button";
import { PricingTable } from "@/components/landing/pricing-table";
import { getAccountNotifications } from "@/lib/db/queries/notifications";
import {
  getSubscriptionByUserId,
  PLAN_LABELS,
  PLAN_PRICES,
  type SubscriptionPlan,
} from "@/lib/db/queries/subscriptions";
import { createClient } from "@/lib/supabase/server";

const ALL_PLANS: SubscriptionPlan[] = ["basic", "plus", "pro"];

function formatDate(date: Date): string {
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

export default async function MypageSubscriptionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const subscription = await getSubscriptionByUserId(user.id);
  const accountNotifications = await getAccountNotifications(user.id);

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
            subscription && subscription.status === "active" ? (
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

      <section>
        <PricingTable />
      </section>

      {accountNotifications.length > 0 && (
        <section className="space-y-3 rounded-2xl bg-card px-5 py-4">
          <h2 className="text-sm font-medium text-card-foreground">결제 알림</h2>
          <div className="flex flex-col gap-2">
            {accountNotifications.map((notification) => (
              <div
                key={notification.id}
                className="rounded-lg border border-border px-3 py-2"
              >
                <p className="text-sm text-card-foreground">
                  {notification.message}
                </p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {formatDate(notification.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
