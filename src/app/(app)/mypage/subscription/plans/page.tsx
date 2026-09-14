import { redirect } from "next/navigation";

import { PlanComparisonTable } from "@/components/landing/pricing-table";
import { PlanActionButton } from "@/components/mypage/plan-action-button";
import { PlanCheckoutButton } from "@/components/mypage/plan-checkout-button";
import { FREE_PLAN_HIGHLIGHTS, PLAN_HIGHLIGHTS } from "@/lib/billing/plan-copy";
import {
  getSubscriptionByUserId,
  PLAN_LABELS,
  PLAN_ORDER,
  PLAN_PRICES,
  type SubscriptionPlan,
} from "@/lib/db/queries/subscriptions";
import { createClient } from "@/lib/supabase/server";

const PAID_PLANS: SubscriptionPlan[] = ["basic", "plus", "pro"];

function formatDate(date: Date): string {
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function PlanCard({
  badge,
  name,
  price,
  highlights,
  ring,
  children,
}: {
  badge: { text: string; tone: "current" | "recommended" } | null;
  name: string;
  price: number;
  highlights: string[];
  ring: "current" | "recommended" | "none";
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex flex-col gap-5 rounded-2xl bg-card px-6 py-7 ring-1 ${
        ring === "current"
          ? "ring-2 ring-primary"
          : ring === "recommended"
            ? "ring-chart-5"
            : "ring-border"
      }`}
    >
      <div>
        <div className="mb-2 h-5">
          {badge && (
            <span
              className={`inline-block rounded-full px-2.5 py-1 font-mono text-[10px] font-medium tracking-wide uppercase ${
                badge.tone === "current"
                  ? "bg-primary/10 text-primary"
                  : "bg-chart-5/10 text-chart-5"
              }`}
            >
              {badge.text}
            </span>
          )}
        </div>
        <p className="text-base font-semibold tracking-wide text-card-foreground uppercase">
          {name}
        </p>
        <p className="mt-3 text-3xl font-semibold tracking-tight text-card-foreground">
          {price.toLocaleString()}
          <span className="text-sm font-normal text-muted-foreground"> 원 / 월</span>
        </p>
      </div>

      <ul className="flex flex-1 flex-col gap-2.5 text-sm text-card-foreground">
        {highlights.map((highlight) => (
          <li key={highlight} className="flex items-start gap-2.5">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
            {highlight}
          </li>
        ))}
      </ul>

      {children}
    </div>
  );
}

function CurrentPlanButton() {
  return (
    <button
      type="button"
      disabled
      className="w-full rounded-lg border border-border py-2 text-sm font-medium text-muted-foreground"
    >
      현재 이용 중
    </button>
  );
}

export default async function MypagePlansPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const subscription = await getSubscriptionByUserId(user.id);
  const isActiveSubscriber = subscription?.status === "active";

  return (
    <main className="flex flex-1 flex-col gap-8 px-6 py-8 sm:px-10">
      <header className="space-y-1">
        <p className="text-xl font-semibold tracking-tight text-foreground">
          플랜 비교/변경
        </p>
        <p className="text-xs text-muted-foreground">
          {subscription
            ? `현재 ${PLAN_LABELS[subscription.plan]} 플랜을 이용 중입니다.`
            : "현재 무료 플랜을 이용 중입니다."}
        </p>
      </header>

      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <PlanCard
          badge={!subscription ? { text: "현재 이용 중", tone: "current" } : null}
          name="무료"
          price={0}
          highlights={FREE_PLAN_HIGHLIGHTS}
          ring={!subscription ? "current" : "none"}
        >
          {!subscription ? (
            <CurrentPlanButton />
          ) : isActiveSubscriber ? (
            <PlanActionButton
              direction="cancel"
              planLabel="무료"
              price={0}
              currentLabel={PLAN_LABELS[subscription.plan]}
              currentPrice={PLAN_PRICES[subscription.plan]}
              targetHighlights={FREE_PLAN_HIGHLIGHTS}
              currentHighlights={PLAN_HIGHLIGHTS[subscription.plan]}
              nextBillingDateLabel={formatDate(subscription.nextBillingDate)}
              canChargeImmediately={false}
            />
          ) : (
            <p className="rounded-lg border border-border px-3 py-2 text-center text-xs text-muted-foreground">
              {subscription.status === "canceled_pending"
                ? `${formatDate(subscription.nextBillingDate)}부터 전환됩니다`
                : "결제 재시도 중입니다"}
            </p>
          )}
        </PlanCard>

        {PAID_PLANS.map((plan) => {
          const isCurrent = isActiveSubscriber && subscription.plan === plan;
          const direction: "current" | "upgrade" | "downgrade" | null =
            !isActiveSubscriber
              ? null
              : isCurrent
                ? "current"
                : PLAN_ORDER[plan] > PLAN_ORDER[subscription.plan]
                  ? "upgrade"
                  : "downgrade";
          const isRecommended = plan === "plus" && !isCurrent;

          return (
            <PlanCard
              key={plan}
              badge={
                isCurrent
                  ? { text: "현재 이용 중", tone: "current" }
                  : isRecommended
                    ? { text: "추천", tone: "recommended" }
                    : null
              }
              name={PLAN_LABELS[plan]}
              price={PLAN_PRICES[plan]}
              highlights={PLAN_HIGHLIGHTS[plan]}
              ring={isCurrent ? "current" : isRecommended ? "recommended" : "none"}
            >
              {direction === "current" ? (
                <CurrentPlanButton />
              ) : direction === "upgrade" || direction === "downgrade" ? (
                <PlanActionButton
                  direction={direction}
                  plan={plan}
                  planLabel={PLAN_LABELS[plan]}
                  price={PLAN_PRICES[plan]}
                  currentLabel={PLAN_LABELS[subscription!.plan]}
                  currentPrice={PLAN_PRICES[subscription!.plan]}
                  targetHighlights={PLAN_HIGHLIGHTS[plan]}
                  currentHighlights={PLAN_HIGHLIGHTS[subscription!.plan]}
                  nextBillingDateLabel={formatDate(subscription!.nextBillingDate)}
                  canChargeImmediately={!subscription!.isPromotional}
                />
              ) : (
                <PlanCheckoutButton
                  plan={plan}
                  userId={user.id}
                  label={`${PLAN_LABELS[plan]} 시작하기`}
                />
              )}
            </PlanCard>
          );
        })}
      </section>

      <section>
        <PlanComparisonTable />
      </section>
    </main>
  );
}
