import { notFound } from "next/navigation";

import { DailyTrendCard } from "@/components/dashboard/daily-trend-card";
import { PlanUsageCard } from "@/components/dashboard/plan-usage-card";
import { RecentCommentsPreview } from "@/components/dashboard/recent-comments-preview";
import { RepeatAuthorNotificationsCard } from "@/components/dashboard/repeat-author-notifications-card";
import { ReviewCallout } from "@/components/dashboard/review-callout";
import { SummaryTiles } from "@/components/dashboard/summary-tiles";
import { TopAuthorsCard } from "@/components/dashboard/top-authors-card";
import { TopVideosCard } from "@/components/dashboard/top-videos-card";
import { countActiveChannelsByUserId, getChannelById } from "@/lib/db/queries/channels";
import {
  countAnalyzedCommentsByChannelId,
  countAnalyzedCommentsThisMonthByUserId,
  countArchivedCommentsByUserId,
  countMaliciousCommentsInRange,
  getDailyMaliciousCounts,
  getDashboardSummary,
  getFlaggedComments,
  getTopAuthorsByMaliciousCount,
  getTopVideosByMaliciousCount,
} from "@/lib/db/queries/comments";
import { getNotifications } from "@/lib/db/queries/notifications";
import {
  getChannelLimitForUser,
  getEvidenceArchiveLimitForUser,
  getMonthlyAnalysisLimitForUser,
  getSubscriptionByUserId,
  getVideoLimitForUser,
  PLAN_LABELS,
} from "@/lib/db/queries/subscriptions";
import { formatClockTime } from "@/lib/format/clock-time";

const RECENT_COMMENTS_LIMIT = 5;
const TREND_DAYS = 7;
const TOP_LIST_LIMIT = 5;

function formatHeaderDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ channelId: string }>;
}) {
  const { channelId } = await params;
  const channel = await getChannelById(channelId);
  if (!channel) notFound();

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [
    summary,
    recentComments,
    allNotifications,
    dailyCounts,
    thisWeekCount,
    lastWeekCount,
    topAuthorsAllTime,
    analyzedCount,
    topVideos,
    subscription,
    monthlyAnalysisLimit,
    monthlyAnalysisUsed,
    evidenceArchiveLimit,
    evidenceArchiveUsed,
    channelLimit,
    channelsUsed,
    videoLimit,
  ] = await Promise.all([
    getDashboardSummary(channelId),
    getFlaggedComments(channelId, { sort: "risk" }, 1, RECENT_COMMENTS_LIMIT),
    getNotifications(channelId, 30),
    getDailyMaliciousCounts(channelId, oneWeekAgo, now),
    countMaliciousCommentsInRange(channelId, oneWeekAgo, now),
    countMaliciousCommentsInRange(channelId, twoWeeksAgo, oneWeekAgo),
    getTopAuthorsByMaliciousCount(channelId, TOP_LIST_LIMIT),
    countAnalyzedCommentsByChannelId(channelId),
    getTopVideosByMaliciousCount(channelId, oneWeekAgo, TOP_LIST_LIMIT),
    getSubscriptionByUserId(channel.userId),
    getMonthlyAnalysisLimitForUser(channel.userId),
    countAnalyzedCommentsThisMonthByUserId(channel.userId),
    getEvidenceArchiveLimitForUser(channel.userId),
    countArchivedCommentsByUserId(channel.userId),
    getChannelLimitForUser(channel.userId),
    countActiveChannelsByUserId(channel.userId),
    getVideoLimitForUser(channel.userId),
  ]);

  const planLabel = subscription ? PLAN_LABELS[subscription.plan] : "무료";
  const isPro = subscription?.plan === "pro";

  const maliciousRate =
    analyzedCount > 0 ? Math.round((summary.total / analyzedCount) * 100) : 0;
  const protectedCount = Math.max(0, summary.total - summary.needsReview);

  const repeatAuthorNotifications = allNotifications
    .filter((n) => n.type === "repeat_author")
    .slice(0, 3);

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8 sm:px-10">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xl font-semibold tracking-tight text-foreground">
            안녕하세요! 👋
          </p>
          <p className="text-xs text-muted-foreground">
            오늘도 안전한 창작 활동을 응원해요.
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-xs text-muted-foreground">
            {formatHeaderDate(oneWeekAgo)} - {formatHeaderDate(now)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            최근 갱신{" "}
            {channel.lastSyncedAt
              ? formatClockTime(channel.lastSyncedAt)
              : "-"}
          </p>
        </div>
      </header>

      <SummaryTiles
        kpis={{
          totalMalicious: summary.total,
          needsReview: summary.needsReview,
          maliciousRate,
          protectedCount,
        }}
        channelId={channelId}
      />

      <ReviewCallout count={summary.needsReview} channelId={channelId} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DailyTrendCard
          dailyCounts={dailyCounts}
          days={TREND_DAYS}
          thisWeekCount={thisWeekCount}
          lastWeekCount={lastWeekCount}
          channelId={channelId}
        />
        <TopAuthorsCard
          title="반복 위험 작성자 TOP 5"
          rows={topAuthorsAllTime}
          channelId={channelId}
        />
      </div>

      <RecentCommentsPreview rows={recentComments} channelId={channelId} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PlanUsageCard
          planLabel={planLabel}
          isPro={isPro}
          monthlyAnalysis={{
            label: "월 댓글 분석량",
            used: monthlyAnalysisUsed,
            limit: monthlyAnalysisLimit,
          }}
          videos={{
            label: "모니터링 영상 수",
            used: channel.monitoredVideoCount,
            limit: videoLimit,
          }}
          evidenceArchive={{
            label: "증거 보관함",
            used: evidenceArchiveUsed,
            limit: evidenceArchiveLimit,
          }}
          channels={{
            label: "채널 연동",
            used: channelsUsed,
            limit: channelLimit,
          }}
        />
        <TopVideosCard rows={topVideos} channelId={channelId} />
      </div>

      <RepeatAuthorNotificationsCard rows={repeatAuthorNotifications} />
    </main>
  );
}
