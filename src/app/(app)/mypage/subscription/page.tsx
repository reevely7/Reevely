import Link from "next/link";
import { redirect } from "next/navigation";

import { CancelSubscriptionButton } from "@/components/mypage/cancel-subscription-button";
import { MypageNav } from "@/components/mypage/mypage-nav";
import { getAccountNotifications } from "@/lib/db/queries/notifications";
import {
  getPaymentHistoryByUserId,
  getSubscriptionByUserId,
  PLAN_LABELS,
  PLAN_PRICES,
} from "@/lib/db/queries/subscriptions";
import { createClient } from "@/lib/supabase/server";

function formatDate(date: Date): string {
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function formatDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default async function MypageSubscriptionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const [subscription, accountNotifications, paymentHistory] = await Promise.all([
    getSubscriptionByUserId(user.id),
    getAccountNotifications(user.id),
    getPaymentHistoryByUserId(user.id),
  ]);

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8 sm:px-10">
      <header>
        <p className="text-xl font-semibold tracking-tight text-foreground">
          마이페이지
        </p>
        <p className="text-xs text-muted-foreground">
          현재 플랜과 결제 내역을 확인할 수 있습니다.
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
        <div className="flex items-center gap-3">
          {subscription && subscription.status === "active" && (
            <CancelSubscriptionButton />
          )}
          <Link
            href="/mypage/subscription/plans"
            className="text-sm font-medium text-primary hover:underline"
          >
            플랜 비교/변경하기 →
          </Link>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl bg-card px-5 py-4">
        <h2 className="text-sm font-medium text-card-foreground">결제 내역</h2>
        {paymentHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground">결제 내역이 없습니다.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {paymentHistory.map((payment) => (
              <li
                key={payment.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
              >
                <span className="text-muted-foreground">
                  {formatDateTime(payment.createdAt)} · {PLAN_LABELS[payment.plan]} ·{" "}
                  {payment.amount.toLocaleString()}원
                </span>
                <span
                  className={
                    payment.status === "succeeded"
                      ? "text-xs text-risk-low"
                      : "text-xs text-risk-high"
                  }
                >
                  {payment.status === "succeeded"
                    ? "결제 완료"
                    : `결제 실패${payment.failReason ? ` (${payment.failReason})` : ""}`}
                </span>
              </li>
            ))}
          </ul>
        )}
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
