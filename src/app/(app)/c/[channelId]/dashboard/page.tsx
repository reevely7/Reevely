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

const RECENT_COMMENTS_LIMIT = 5;
const TREND_DAYS = 7;
const TOP_LIST_LIMIT = 5;

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
    topAuthorsThisWeek,
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
    getTopAuthorsByMaliciousCount(channelId, TOP_LIST_LIMIT, oneWeekAgo),
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

  const repeatAuthorNotifications = allNotifications
    .filter((n) => n.type === "repeat_author")
    .slice(0, 3);

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8 sm:px-10">
      <header>
        <p className="text-xl font-semibold tracking-tight text-foreground">
          대시보드
        </p>
        <p className="text-xs text-muted-foreground">
          {channel.channelTitle} 채널의 위험 댓글 현황입니다.
        </p>
      </header>

      <SummaryTiles summary={summary} channelId={channelId} />

      <ReviewCallout count={summary.needsReview} channelId={channelId} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DailyTrendCard
          dailyCounts={dailyCounts}
          days={TREND_DAYS}
          thisWeekCount={thisWeekCount}
          lastWeekCount={lastWeekCount}
          channelId={channelId}
        />
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
      </div>

      <RecentCommentsPreview rows={recentComments} channelId={channelId} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TopAuthorsCard
          title="요주의 작성자 (누적)"
          rows={topAuthorsAllTime}
          channelId={channelId}
        />
        <TopAuthorsCard
          title="요주의 작성자 (최근 7일)"
          rows={topAuthorsThisWeek}
          channelId={channelId}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TopVideosCard rows={topVideos} channelId={channelId} />
        <RepeatAuthorNotificationsCard rows={repeatAuthorNotifications} />
      </div>
    </main>
  );
}
