import { redirect } from "next/navigation";

import { DailyTrendCard } from "@/components/dashboard/daily-trend-card";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { RecentCommentsPreview } from "@/components/dashboard/recent-comments-preview";
import { RepeatAuthorNotificationsCard } from "@/components/dashboard/repeat-author-notifications-card";
import { ReviewCallout } from "@/components/dashboard/review-callout";
import { SubscriptionsCard } from "@/components/dashboard/subscriptions-card";
import { SummaryTiles } from "@/components/dashboard/summary-tiles";
import { TopAuthorsCard } from "@/components/dashboard/top-authors-card";
import { TopVideosCard } from "@/components/dashboard/top-videos-card";
import { getChannelByUserId } from "@/lib/db/queries/channels";
import {
  countMaliciousCommentsInRange,
  getDailyMaliciousCounts,
  getDashboardSummary,
  getFlaggedComments,
  getTopAuthorsByMaliciousCount,
  getTopVideosByMaliciousCount,
} from "@/lib/db/queries/comments";
import {
  countAuthorSubscriptions,
  countUnreadNotifications,
  getNotifications,
} from "@/lib/db/queries/notifications";
import { createClient } from "@/lib/supabase/server";

const RECENT_NOTIFICATIONS_LIMIT = 8;
const RECENT_COMMENTS_LIMIT = 5;
const TREND_DAYS = 14;
const TOP_LIST_LIMIT = 5;

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [
    channel,
    summary,
    recentComments,
    unreadNotificationCount,
    recentNotifications,
    allNotifications,
    dailyCounts,
    thisWeekCount,
    lastWeekCount,
    topAuthors,
    topVideos,
    subscriptionCount,
  ] = await Promise.all([
    getChannelByUserId(user.id),
    getDashboardSummary(user.id),
    getFlaggedComments(user.id, { sort: "risk" }, 1, RECENT_COMMENTS_LIMIT),
    countUnreadNotifications(user.id),
    getNotifications(user.id, RECENT_NOTIFICATIONS_LIMIT),
    getNotifications(user.id, 30),
    getDailyMaliciousCounts(user.id, twoWeeksAgo, now),
    countMaliciousCommentsInRange(user.id, oneWeekAgo, now),
    countMaliciousCommentsInRange(user.id, twoWeeksAgo, oneWeekAgo),
    getTopAuthorsByMaliciousCount(user.id, TOP_LIST_LIMIT),
    getTopVideosByMaliciousCount(user.id, twoWeeksAgo, TOP_LIST_LIMIT),
    countAuthorSubscriptions(user.id),
  ]);

  const repeatAuthorNotifications = allNotifications
    .filter((n) => n.type === "repeat_author")
    .slice(0, 3);

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8 sm:px-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xl font-semibold tracking-tight text-foreground">
            대시보드
          </p>
          <p className="text-xs text-muted-foreground">
            채널 전반의 위험 댓글 현황입니다.
            {channel?.subscriberCount != null &&
              ` · 구독자 ${channel.subscriberCount.toLocaleString("ko-KR")}명`}
          </p>
        </div>
        <NotificationBell
          notifications={recentNotifications}
          unreadCount={unreadNotificationCount}
        />
      </header>

      <SummaryTiles summary={summary} />

      <ReviewCallout count={summary.needsReview} />

      <DailyTrendCard
        dailyCounts={dailyCounts}
        days={TREND_DAYS}
        thisWeekCount={thisWeekCount}
        lastWeekCount={lastWeekCount}
      />

      <RecentCommentsPreview rows={recentComments} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TopAuthorsCard rows={topAuthors} />
        <TopVideosCard rows={topVideos} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SubscriptionsCard count={subscriptionCount} />
        <RepeatAuthorNotificationsCard rows={repeatAuthorNotifications} />
      </div>
    </main>
  );
}
