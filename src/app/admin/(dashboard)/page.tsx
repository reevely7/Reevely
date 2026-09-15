import Link from "next/link";

import { getAdminAuditLog } from "@/lib/db/queries/admin-audit-log";
import { getQualityOverview } from "@/lib/db/queries/ai-quality";
import { getAllChannels } from "@/lib/db/queries/channels";
import { countReportedFalseComments, getArchivedCommentCountsByUser } from "@/lib/db/queries/comments";
import { getCronRuns } from "@/lib/db/queries/cron-runs";
import { getAnalysisQuotaReachedUsersThisMonth } from "@/lib/db/queries/notifications";
import {
  getAllSubscriptionsForAdmin,
  PLAN_EVIDENCE_ARCHIVE_LIMITS,
  PLAN_LABELS,
  PLAN_PRICES,
  FREE_EVIDENCE_ARCHIVE_LIMIT,
  type SubscriptionPlan,
} from "@/lib/db/queries/subscriptions";
import { getSuspendedUserIds } from "@/lib/db/queries/suspended-users";
import { getYoutubeApiUsageRecent } from "@/lib/db/queries/youtube-quota";
import { createAdminClient } from "@/lib/supabase/admin";

const PLANS: SubscriptionPlan[] = ["basic", "plus", "pro"];
const FETCH_LIMIT = 1000;
const DAILY_QUOTA_LIMIT = 10000;
const RECENT_LIMIT = 5;

const CRON_ACTION_LABELS: Record<string, string> = {
  suspend_user: "계정 정지",
  unsuspend_user: "정지 해제",
  disconnect_channel: "채널 연동 해제(대행)",
  delete_account: "계정 완전 삭제",
  change_plan: "플랜 변경",
  grant_promotional_plan: "프로모션 플랜 부여",
};

function formatDateTime(value: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${value.getFullYear()}.${pad(value.getMonth() + 1)}.${pad(value.getDate())} ${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

export default async function AdminDashboardPage() {
  const [
    channels,
    suspendedUserIds,
    { data: usersData, error: usersError },
    subscriptions,
    qualityOverview,
    quotaUsage,
    recentCronRuns,
    quotaReachedUsers,
    reportedFalseCount,
    archiveCounts,
    recentAuditLog,
  ] = await Promise.all([
    getAllChannels(),
    getSuspendedUserIds(),
    createAdminClient().auth.admin.listUsers({ page: 1, perPage: FETCH_LIMIT }),
    getAllSubscriptionsForAdmin(),
    getQualityOverview(),
    getYoutubeApiUsageRecent(1),
    getCronRuns(undefined, RECENT_LIMIT),
    getAnalysisQuotaReachedUsersThisMonth(),
    countReportedFalseComments(),
    getArchivedCommentCountsByUser(),
    getAdminAuditLog(RECENT_LIMIT),
  ]);

  const totalUsers = usersError ? 0 : usersData.users.length;
  const emailByUserId = new Map(
    (usersError ? [] : usersData.users).map((u) => [u.id, u.email || "-"]),
  );

  const lockedChannels = channels.filter((c) => c.status === "locked").length;
  const reauthChannels = channels.filter((c) => c.reauthRequiredAt).length;

  const activeSubs = subscriptions.filter((s) => s.status === "active");
  const payingActiveSubs = activeSubs.filter((s) => !s.isPromotional);
  const mrr = payingActiveSubs.reduce((sum, s) => sum + PLAN_PRICES[s.plan], 0);
  const planCounts = Object.fromEntries(
    PLANS.map((plan) => [plan, activeSubs.filter((s) => s.plan === plan).length]),
  ) as Record<SubscriptionPlan, number>;
  const paymentFailedCount = subscriptions.filter((s) => s.status === "payment_failed").length;

  const todayDateString = new Date().toISOString().slice(0, 10);
  const todayQuota = quotaUsage.find((q) => q.date === todayDateString)?.units ?? 0;

  const cronIssues = recentCronRuns.filter((r) => r.errorCount > 0 || r.fatalError);

  const planByUserId = new Map(subscriptions.map((s) => [s.userId, s.plan]));
  const archiveNearLimitCount = archiveCounts.filter((row) => {
    const plan = planByUserId.get(row.userId);
    const limit = plan ? PLAN_EVIDENCE_ARCHIVE_LIMITS[plan] : FREE_EVIDENCE_ARCHIVE_LIMIT;
    return limit !== null && limit > 0 && row.count / limit >= 0.9;
  }).length;

  const warnings = [
    todayQuota >= DAILY_QUOTA_LIMIT * 0.8 && {
      label: `오늘 YouTube 쿼터 ${todayQuota.toLocaleString()} / ${DAILY_QUOTA_LIMIT.toLocaleString()} 소진`,
      href: "/admin/system",
    },
    cronIssues.length > 0 && {
      label: `최근 cron 실행 중 에러 ${cronIssues.length}건`,
      href: "/admin/system",
    },
    paymentFailedCount > 0 && {
      label: `결제 유예 중인 유저 ${paymentFailedCount}명`,
      href: "/admin/subscriptions",
    },
    quotaReachedUsers.length > 0 && {
      label: `이번 달 분석 한도 도달 유저 ${quotaReachedUsers.length}명`,
      href: "/admin/system",
    },
    archiveNearLimitCount > 0 && {
      label: `증거 보관함 한도 90% 이상 유저 ${archiveNearLimitCount}명`,
      href: "/admin/content",
    },
  ].filter((w): w is { label: string; href: string } => Boolean(w));

  return (
    <main className="flex flex-1 flex-col gap-6 bg-background px-8 py-10 text-foreground">
      <header>
        <p className="text-xl font-semibold tracking-tight">관리자 대시보드</p>
        <p className="text-xs text-muted-foreground">전체 현황 요약입니다.</p>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <div className="rounded-2xl bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">전체 유저</p>
          <p className="text-lg font-semibold tracking-tight">{totalUsers.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">정지된 유저</p>
          <p className="text-lg font-semibold tracking-tight">{suspendedUserIds.size.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">전체 채널</p>
          <p className="text-lg font-semibold tracking-tight">{channels.length.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">잠김 / 재연동 필요</p>
          <p className="text-lg font-semibold tracking-tight">
            {lockedChannels} / {reauthChannels}
          </p>
        </div>
        <div className="rounded-2xl bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">MRR (실결제)</p>
          <p className="text-lg font-semibold tracking-tight">{mrr.toLocaleString()}원</p>
        </div>
        <div className="rounded-2xl bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">오탐 신고율</p>
          <p className="text-lg font-semibold tracking-tight">
            {overviewFalsePositiveLabel(qualityOverview.falsePositiveRate)}
          </p>
        </div>
        <div className="rounded-2xl bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">검토 필요 큐</p>
          <p className="text-lg font-semibold tracking-tight">
            {qualityOverview.needsReview.toLocaleString()}
          </p>
        </div>
        <div className="rounded-2xl bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">오탐 신고 큐</p>
          <p className="text-lg font-semibold tracking-tight">{reportedFalseCount.toLocaleString()}</p>
        </div>
        <div
          className={`rounded-2xl px-4 py-3 ${
            todayQuota >= DAILY_QUOTA_LIMIT * 0.8 ? "bg-risk-high-bg" : "bg-card"
          }`}
        >
          <p className="text-xs text-muted-foreground">오늘 YouTube 쿼터</p>
          <p
            className={`text-lg font-semibold tracking-tight ${
              todayQuota >= DAILY_QUOTA_LIMIT * 0.8 ? "text-risk-high" : ""
            }`}
          >
            {todayQuota.toLocaleString()} / {DAILY_QUOTA_LIMIT.toLocaleString()}
          </p>
        </div>
        {PLANS.map((plan) => (
          <div key={plan} className="rounded-2xl bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">{PLAN_LABELS[plan]}</p>
            <p className="text-lg font-semibold tracking-tight">{planCounts[plan]}명</p>
          </div>
        ))}
      </section>

      <section className="space-y-3 rounded-2xl bg-card px-5 py-4">
        <h2 className="text-sm font-medium text-card-foreground">주의 필요</h2>
        {warnings.length === 0 ? (
          <p className="text-sm text-muted-foreground">특이사항 없음</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {warnings.map((w) => (
              <li key={w.label}>
                <Link
                  href={w.href}
                  className="flex items-center justify-between rounded-lg bg-risk-high-bg px-3 py-2 text-sm text-risk-high hover:underline"
                >
                  {w.label}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="space-y-3 rounded-2xl bg-card px-5 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-card-foreground">최근 cron 실행</h2>
            <Link href="/admin/system" className="text-xs text-primary hover:underline">
              전체 보기 →
            </Link>
          </div>
          {recentCronRuns.length === 0 ? (
            <p className="text-sm text-muted-foreground">실행 이력이 없습니다.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {recentCronRuns.map((run) => (
                <li
                  key={run.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
                >
                  <span className="text-muted-foreground">{run.cronName}</span>
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    {formatDateTime(run.startedAt)}
                    {(run.errorCount > 0 || run.fatalError) && (
                      <span className="rounded-full bg-risk-high-bg px-2 py-0.5 text-[11px] text-risk-high">
                        {run.fatalError ? "전체 실패" : `에러 ${run.errorCount}건`}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3 rounded-2xl bg-card px-5 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-card-foreground">최근 관리자 액션</h2>
            <Link href="/admin/audit-log" className="text-xs text-primary hover:underline">
              전체 보기 →
            </Link>
          </div>
          {recentAuditLog.length === 0 ? (
            <p className="text-sm text-muted-foreground">기록이 없습니다.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {recentAuditLog.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
                >
                  <span className="text-muted-foreground">
                    {row.adminUsername} · {CRON_ACTION_LABELS[row.action] ?? row.action}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {row.targetUserId
                      ? (emailByUserId.get(row.targetUserId) ?? row.targetUserId)
                      : "-"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

function overviewFalsePositiveLabel(rate: number | null): string {
  if (rate === null) return "-";
  return `${(rate * 100).toFixed(1)}%`;
}
