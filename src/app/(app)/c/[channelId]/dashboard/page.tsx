import { notFound } from "next/navigation";

import { DailyTrendCard } from "@/components/dashboard/daily-trend-card";
import { PlanUsageCard } from "@/components/dashboard/plan-usage-card";
import { RecentCommentsPreview } from "@/components/dashboard/recent-comments-preview";
import { SummaryTiles } from "@/components/dashboard/summary-tiles";
import { TopAuthorsCard } from "@/components/dashboard/top-authors-card";
import { TopVideosCard } from "@/components/dashboard/top-videos-card";
import { countActiveChannelsByUserId, getChannelById } from "@/lib/db/queries/channels";
import {
  countAnalyzedCommentsInRange,
  countAnalyzedCommentsThisMonthByUserId,
  countArchivedCommentsByUserId,
  countMaliciousCommentsInRange,
  countNeedsReviewInRange,
  getDailyMaliciousCounts,
  getFlaggedComments,
  getTopAuthorsByMaliciousCount,
  getTopVideosByMaliciousCount,
} from "@/lib/db/queries/comments";
import {
  getChannelLimitForUser,
  getEvidenceArchiveLimitForUser,
  getMonthlyAnalysisLimitForUser,
  getSubscriptionByUserId,
  getVideoLimitForUser,
  PLAN_LABELS,
} from "@/lib/db/queries/subscriptions";
import { pickGreeting } from "@/lib/greeting";

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
    recentComments,
    dailyCounts,
    thisWeekCount,
    lastWeekCount,
    thisWeekAnalyzed,
    lastWeekAnalyzed,
    thisWeekNeedsReview,
    lastWeekNeedsReview,
    topAuthorsAllTime,
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
    getFlaggedComments(channelId, { sort: "risk" }, 1, RECENT_COMMENTS_LIMIT),
    getDailyMaliciousCounts(channelId, oneWeekAgo, now),
    countMaliciousCommentsInRange(channelId, oneWeekAgo, now),
    countMaliciousCommentsInRange(channelId, twoWeeksAgo, oneWeekAgo),
    countAnalyzedCommentsInRange(channelId, oneWeekAgo, now),
    countAnalyzedCommentsInRange(channelId, twoWeeksAgo, oneWeekAgo),
    countNeedsReviewInRange(channelId, oneWeekAgo, now),
    countNeedsReviewInRange(channelId, twoWeeksAgo, oneWeekAgo),
    getTopAuthorsByMaliciousCount(channelId, TOP_LIST_LIMIT),
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

  const maliciousRateThisWeek =
    thisWeekAnalyzed > 0 ? Math.round((thisWeekCount / thisWeekAnalyzed) * 100) : 0;
  const maliciousRateLastWeek =
    lastWeekAnalyzed > 0 ? Math.round((lastWeekCount / lastWeekAnalyzed) * 100) : 0;
  const protectedCountThisWeek = Math.max(0, thisWeekCount - thisWeekNeedsReview);
  const protectedCountLastWeek = Math.max(0, lastWeekCount - lastWeekNeedsReview);

  const greeting = pickGreeting(now);

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8 sm:px-10">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-2xl font-bold tracking-tight text-foreground">
            {greeting.heading}
          </p>
          <p className="text-sm text-muted-foreground">{greeting.message}</p>
        </div>
        <div className="text-left sm:mt-8 sm:text-right">
          <p className="text-base text-muted-foreground">
            {formatHeaderDate(oneWeekAgo)} - {formatHeaderDate(now)}
          </p>
        </div>
      </header>

      <SummaryTiles
        kpis={{
          totalComments: { value: thisWeekAnalyzed, previous: lastWeekAnalyzed },
          needsReview: { value: thisWeekNeedsReview, previous: lastWeekNeedsReview },
          maliciousRate: { value: maliciousRateThisWeek, previous: maliciousRateLastWeek },
          protectedCount: { value: protectedCountThisWeek, previous: protectedCountLastWeek },
        }}
        channelId={channelId}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
        <RecentCommentsPreview rows={recentComments} channelId={channelId} />
        <DailyTrendCard
          dailyCounts={dailyCounts}
          days={TREND_DAYS}
          thisWeekCount={thisWeekCount}
          lastWeekCount={lastWeekCount}
          channelId={channelId}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <TopVideosCard rows={topVideos} channelId={channelId} />
        <TopAuthorsCard
          title="반복 위험 작성자 TOP 5"
          rows={topAuthorsAllTime}
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
    </main>
  );
}
