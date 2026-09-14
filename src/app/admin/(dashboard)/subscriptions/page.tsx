import Link from "next/link";

import {
  getAllSubscriptionsForAdmin,
  PLAN_LABELS,
  PLAN_PRICES,
  type SubscriptionPlan,
} from "@/lib/db/queries/subscriptions";
import { createAdminClient } from "@/lib/supabase/admin";

const PLANS: SubscriptionPlan[] = ["basic", "plus", "pro"];
const FETCH_LIMIT = 1000;

function formatDateTime(value: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${value.getFullYear()}.${pad(value.getMonth() + 1)}.${pad(value.getDate())} ${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

export default async function AdminSubscriptionsPage() {
  const [subscriptions, { data: usersData, error: usersError }] = await Promise.all([
    getAllSubscriptionsForAdmin(),
    createAdminClient().auth.admin.listUsers({ page: 1, perPage: FETCH_LIMIT }),
  ]);
  const totalUsers = usersError ? 0 : usersData.users.length;
  const emailByUserId = new Map(
    (usersError ? [] : usersData.users).map((u) => [u.id, u.email || "-"]),
  );

  const activeSubs = subscriptions.filter((s) => s.status === "active");
  // 프로모션 구독은 실제 결제수단이 없어 실매출이 아니므로 MRR 계산에서 뺀다
  const payingActiveSubs = activeSubs.filter((s) => !s.isPromotional);
  const mrr = payingActiveSubs.reduce((sum, s) => sum + PLAN_PRICES[s.plan], 0);

  const planCounts = Object.fromEntries(
    PLANS.map((plan) => [plan, activeSubs.filter((s) => s.plan === plan).length]),
  ) as Record<SubscriptionPlan, number>;
  const freeCount = Math.max(0, totalUsers - subscriptions.length);

  const paymentFailed = subscriptions.filter((s) => s.status === "payment_failed");
  const canceledPending = subscriptions.filter((s) => s.status === "canceled_pending");

  return (
    <main className="flex flex-1 flex-col gap-6 bg-background px-8 py-10 text-foreground">
      <header>
        <p className="text-xl font-semibold tracking-tight">구독/결제 관리</p>
        <p className="text-xs text-muted-foreground">
          결제 이력은 각 유저 상세 페이지에서 확인할 수 있습니다.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-2xl bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">MRR (실결제 기준)</p>
          <p className="text-lg font-semibold tracking-tight">{mrr.toLocaleString()}원</p>
        </div>
        <div className="rounded-2xl bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">무료</p>
          <p className="text-lg font-semibold tracking-tight">{freeCount}명</p>
        </div>
        {PLANS.map((plan) => (
          <div key={plan} className="rounded-2xl bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">{PLAN_LABELS[plan]}</p>
            <p className="text-lg font-semibold tracking-tight">{planCounts[plan]}명</p>
          </div>
        ))}
      </section>

      <section className="space-y-3 rounded-2xl bg-card px-5 py-4">
        <h2 className="text-sm font-medium text-card-foreground">
          결제 유예 중 ({paymentFailed.length}명) — 이탈 위험
        </h2>
        {paymentFailed.length === 0 ? (
          <p className="text-sm text-muted-foreground">해당 없음</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {paymentFailed.map((s) => (
              <li
                key={s.userId}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
              >
                <Link
                  href={`/admin/users/${s.userId}`}
                  className="text-primary hover:underline"
                >
                  {emailByUserId.get(s.userId) ?? s.userId}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {PLAN_LABELS[s.plan]} · 재시도 예정일 {formatDateTime(s.nextBillingDate)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3 rounded-2xl bg-card px-5 py-4">
        <h2 className="text-sm font-medium text-card-foreground">
          해지 예정 ({canceledPending.length}명)
        </h2>
        {canceledPending.length === 0 ? (
          <p className="text-sm text-muted-foreground">해당 없음</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {canceledPending.map((s) => (
              <li
                key={s.userId}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
              >
                <Link
                  href={`/admin/users/${s.userId}`}
                  className="text-primary hover:underline"
                >
                  {emailByUserId.get(s.userId) ?? s.userId}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {PLAN_LABELS[s.plan]} · 해지 예정일 {formatDateTime(s.nextBillingDate)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
