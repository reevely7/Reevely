import { notFound, redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { deleteChannelById, deleteChannelByUserId, getChannelById, getChannelsByUserId } from "@/lib/db/queries/channels";
import { deleteCommentsByUserId } from "@/lib/db/queries/comments";
import { deleteNotificationsByUserId, getNotificationsByUserId } from "@/lib/db/queries/notifications";
import { getPaymentHistoryByUserId, getSubscriptionByUserId, PLAN_LABELS } from "@/lib/db/queries/subscriptions";
import { isUserSuspended, suspendUser, unsuspendUser } from "@/lib/db/queries/suspended-users";
import { createAdminClient } from "@/lib/supabase/admin";

const RECENT_NOTIFICATIONS_LIMIT = 10;
// 계정 정지는 Supabase Auth의 ban_duration으로 로그인을 막는다 — "none"이
// 해제, 그 외엔 유효기간 문자열이 필요해 사실상 무기한인 값을 쓴다.
const BAN_DURATION = "876000h"; // 100년

function formatDateTime(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user) {
    notFound();
  }
  const user = data.user;
  const nickname = (user.user_metadata?.nickname as string | undefined) ?? null;

  const [channels, subscription, paymentHistory, notifications, suspended] = await Promise.all([
    getChannelsByUserId(userId),
    getSubscriptionByUserId(userId),
    getPaymentHistoryByUserId(userId),
    getNotificationsByUserId(userId, RECENT_NOTIFICATIONS_LIMIT),
    isUserSuspended(userId),
  ]);

  async function suspendAccount(formData: FormData) {
    "use server";
    const reason = String(formData.get("reason") ?? "").trim() || undefined;

    await createAdminClient().auth.admin.updateUserById(userId, {
      ban_duration: BAN_DURATION,
    });
    await suspendUser(userId, reason);
    redirect(`/admin/users/${userId}`);
  }

  async function unsuspendAccount() {
    "use server";
    await createAdminClient().auth.admin.updateUserById(userId, {
      ban_duration: "none",
    });
    await unsuspendUser(userId);
    redirect(`/admin/users/${userId}`);
  }

  async function disconnectChannelAdmin(formData: FormData) {
    "use server";
    const channelId = String(formData.get("channelId"));

    const channel = await getChannelById(channelId);
    if (!channel || channel.userId !== userId) {
      redirect(`/admin/users/${userId}`);
    }

    await deleteChannelById(channelId);
    redirect(`/admin/users/${userId}`);
  }

  async function deleteAccountAdmin() {
    "use server";
    await deleteNotificationsByUserId(userId);
    await deleteCommentsByUserId(userId);
    await deleteChannelByUserId(userId);
    await createAdminClient().auth.admin.deleteUser(userId);
    redirect("/admin/users");
  }

  return (
    <main className="flex flex-1 flex-col gap-6 bg-background px-8 py-10 text-foreground">
      <header className="space-y-1">
        <p className="text-xl font-semibold tracking-tight">{user.email || "(이메일 없음)"}</p>
        <p className="text-xs text-muted-foreground">
          {nickname ? `${nickname} · ` : ""}가입일 {formatDateTime(user.created_at)}
          {suspended && (
            <span className="ml-2 rounded-full bg-risk-high-bg px-2 py-0.5 text-[11px] text-risk-high">
              정지됨
            </span>
          )}
        </p>
      </header>

      <section className="space-y-3 rounded-2xl bg-card px-5 py-4">
        <h2 className="text-sm font-medium text-card-foreground">구독</h2>
        <p className="text-sm text-muted-foreground">
          {subscription ? `${PLAN_LABELS[subscription.plan]} · 다음 결제일 ${formatDateTime(subscription.nextBillingDate)}` : "무료 플랜"}
        </p>
      </section>

      <section className="space-y-3 rounded-2xl bg-card px-5 py-4">
        <h2 className="text-sm font-medium text-card-foreground">
          연동 채널 ({channels.length}개)
        </h2>
        {channels.length === 0 ? (
          <p className="text-sm text-muted-foreground">연동된 채널이 없습니다.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {channels.map((channel) => (
              <li
                key={channel.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
              >
                <span className="text-sm text-muted-foreground">
                  {channel.channelTitle}
                  {channel.status === "locked" && (
                    <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                      잠김
                    </span>
                  )}
                  {channel.reauthRequiredAt && (
                    <span className="ml-2 rounded-full bg-risk-high-bg px-2 py-0.5 text-[11px] text-risk-high">
                      연동 끊김
                    </span>
                  )}
                </span>
                <form action={disconnectChannelAdmin}>
                  <input type="hidden" name="channelId" value={channel.id} />
                  <Button type="submit" variant="outline" size="sm">
                    연동 해제
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3 rounded-2xl bg-card px-5 py-4">
        <h2 className="text-sm font-medium text-card-foreground">결제 이력</h2>
        {paymentHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground">결제 이력이 없습니다.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {paymentHistory.map((payment) => (
              <li
                key={payment.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
              >
                <span className="text-muted-foreground">
                  {formatDateTime(payment.createdAt)} · {PLAN_LABELS[payment.plan]} · {payment.amount.toLocaleString()}원
                </span>
                <span
                  className={
                    payment.status === "succeeded"
                      ? "text-xs text-risk-low"
                      : "text-xs text-risk-high"
                  }
                >
                  {payment.status === "succeeded" ? "성공" : `실패${payment.failReason ? ` (${payment.failReason})` : ""}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3 rounded-2xl bg-card px-5 py-4">
        <h2 className="text-sm font-medium text-card-foreground">최근 알림</h2>
        {notifications.length === 0 ? (
          <p className="text-sm text-muted-foreground">알림이 없습니다.</p>
        ) : (
          <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            {notifications.map((n) => (
              <li key={n.id}>
                {formatDateTime(n.createdAt)} · {n.title ?? n.type}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3 rounded-2xl bg-risk-high-bg px-5 py-4">
        <h2 className="text-sm font-medium text-risk-high">관리자 액션</h2>

        {suspended ? (
          <form action={unsuspendAccount}>
            <Button type="submit" variant="outline" size="sm">
              정지 해제
            </Button>
          </form>
        ) : (
          <form action={suspendAccount} className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              name="reason"
              placeholder="정지 사유 (선택)"
              className="h-8 flex-1 min-w-48 rounded-md border border-border bg-background px-2.5 text-sm text-foreground"
            />
            <Button type="submit" variant="destructive" size="sm">
              계정 정지 (로그인 차단 + 채널 처리 중단)
            </Button>
          </form>
        )}

        <form action={deleteAccountAdmin}>
          <Button type="submit" variant="destructive" size="sm">
            계정 완전 삭제
          </Button>
        </form>
      </section>
    </main>
  );
}
