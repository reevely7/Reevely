import { redirect } from "next/navigation";

import { NotificationBell } from "@/components/dashboard/notification-bell";
import { RecentCommentsPreview } from "@/components/dashboard/recent-comments-preview";
import { ReviewCallout } from "@/components/dashboard/review-callout";
import { SummaryTiles } from "@/components/dashboard/summary-tiles";
import {
  getDashboardSummary,
  getFlaggedComments,
} from "@/lib/db/queries/comments";
import {
  countUnreadNotifications,
  getNotifications,
} from "@/lib/db/queries/notifications";
import { createClient } from "@/lib/supabase/server";

const RECENT_NOTIFICATIONS_LIMIT = 8;
const RECENT_COMMENTS_LIMIT = 5;

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const [summary, recentComments, unreadNotificationCount, recentNotifications] =
    await Promise.all([
      getDashboardSummary(user.id),
      getFlaggedComments(
        user.id,
        { sort: "risk" },
        1,
        RECENT_COMMENTS_LIMIT,
      ),
      countUnreadNotifications(user.id),
      getNotifications(user.id, RECENT_NOTIFICATIONS_LIMIT),
    ]);

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

      <RecentCommentsPreview rows={recentComments} />
    </main>
  );
}
