import { redirect } from "next/navigation";

import { DailyTrendCard } from "@/components/dashboard/daily-trend-card";
import { InstagramTrendPlaceholderCard } from "@/components/dashboard/instagram-trend-placeholder-card";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { RecentCommentsPreview } from "@/components/dashboard/recent-comments-preview";
import { RepeatAuthorNotificationsCard } from "@/components/dashboard/repeat-author-notifications-card";
import { ReviewCallout } from "@/components/dashboard/review-callout";
import { SummaryTiles } from "@/components/dashboard/summary-tiles";
import { TopAuthorsCard } from "@/components/dashboard/top-authors-card";
import { TopVideosCard } from "@/components/dashboard/top-videos-card";
import {
  countMaliciousCommentsInRange,
  getDailyMaliciousCounts,
  getDashboardSummary,
  getFlaggedComments,
  getTopAuthorsByMaliciousCount,
  getTopVideosByMaliciousCount,
} from "@/lib/db/queries/comments";
import {
  countUnreadNotifications,
  getNotifications,
} from "@/lib/db/queries/notifications";
import { createClient } from "@/lib/supabase/server";

const RECENT_NOTIFICATIONS_LIMIT = 8;
const RECENT_COMMENTS_LIMIT = 5;
const TREND_DAYS = 7;
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
    summary,
    recentComments,
    unreadNotificationCount,
    recentNotifications,
    allNotifications,
    dailyCounts,
    thisWeekCount,
    lastWeekCount,
    topAuthorsAllTime,
    topAuthorsThisWeek,
    topVideos,
  ] = await Promise.all([
    getDashboardSummary(user.id),
    getFlaggedComments(user.id, { sort: "risk" }, 1, RECENT_COMMENTS_LIMIT),
    countUnreadNotifications(user.id),
    getNotifications(user.id, RECENT_NOTIFICATIONS_LIMIT),
    getNotifications(user.id, 30),
    getDailyMaliciousCounts(user.id, oneWeekAgo, now),
    countMaliciousCommentsInRange(user.id, oneWeekAgo, now),
    countMaliciousCommentsInRange(user.id, twoWeeksAgo, oneWeekAgo),
    getTopAuthorsByMaliciousCount(user.id, TOP_LIST_LIMIT),
    getTopAuthorsByMaliciousCount(user.id, TOP_LIST_LIMIT, oneWeekAgo),
    getTopVideosByMaliciousCount(user.id, oneWeekAgo, TOP_LIST_LIMIT),
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
          </p>
        </div>
        <NotificationBell
          notifications={recentNotifications}
          unreadCount={unreadNotificationCount}
        />
      </header>

      <SummaryTiles summary={summary} />

      <ReviewCallout count={summary.needsReview} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DailyTrendCard
          dailyCounts={dailyCounts}
          days={TREND_DAYS}
          thisWeekCount={thisWeekCount}
          lastWeekCount={lastWeekCount}
        />
        <InstagramTrendPlaceholderCard />
      </div>

      <RecentCommentsPreview rows={recentComments} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TopAuthorsCard title="요주의 작성자 (누적)" rows={topAuthorsAllTime} />
        <TopAuthorsCard
          title="요주의 작성자 (최근 7일)"
          rows={topAuthorsThisWeek}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TopVideosCard rows={topVideos} />
        <RepeatAuthorNotificationsCard rows={repeatAuthorNotifications} />
      </div>
    </main>
  );
}
