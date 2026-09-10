import { notFound } from "next/navigation";

import { DailyTrendCard } from "@/components/dashboard/daily-trend-card";
import { InstagramTrendPlaceholderCard } from "@/components/dashboard/instagram-trend-placeholder-card";
import { RecentCommentsPreview } from "@/components/dashboard/recent-comments-preview";
import { RepeatAuthorNotificationsCard } from "@/components/dashboard/repeat-author-notifications-card";
import { ReviewCallout } from "@/components/dashboard/review-callout";
import { SummaryTiles } from "@/components/dashboard/summary-tiles";
import { TopAuthorsCard } from "@/components/dashboard/top-authors-card";
import { TopVideosCard } from "@/components/dashboard/top-videos-card";
import { getChannelById } from "@/lib/db/queries/channels";
import {
  countMaliciousCommentsInRange,
  getDailyMaliciousCounts,
  getDashboardSummary,
  getFlaggedComments,
  getTopAuthorsByMaliciousCount,
  getTopVideosByMaliciousCount,
} from "@/lib/db/queries/comments";
import { getNotifications } from "@/lib/db/queries/notifications";

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
  ]);

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
        <InstagramTrendPlaceholderCard />
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
