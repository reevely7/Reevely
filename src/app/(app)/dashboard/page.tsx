import { redirect } from "next/navigation";

import { CommentFilters } from "@/components/dashboard/comment-filters";
import { CommentSearch } from "@/components/dashboard/comment-search";
import { CommentsTable } from "@/components/dashboard/comments-table";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { Pagination } from "@/components/dashboard/pagination";
import { SummaryTiles } from "@/components/dashboard/summary-tiles";
import {
  countFlaggedComments,
  getDashboardSummary,
  getFlaggedComments,
  getFlaggedFilterOptions,
  type CommentFilters as CommentFiltersType,
} from "@/lib/db/queries/comments";
import {
  countUnreadNotifications,
  getNotifications,
} from "@/lib/db/queries/notifications";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 15;
const RECENT_NOTIFICATIONS_LIMIT = 8;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    risk?: string;
    category?: string;
    status?: string;
    video?: string;
    search?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const params = await searchParams;
  const filters: CommentFiltersType = {
    riskLevel: params.risk as CommentFiltersType["riskLevel"],
    category: params.category,
    status: params.status as CommentFiltersType["status"],
    videoId: params.video,
    search: params.search,
    sort: params.sort as CommentFiltersType["sort"],
  };
  const page = Math.max(1, Number(params.page) || 1);

  const [
    summary,
    rows,
    filterOptions,
    totalCount,
    unreadNotificationCount,
    recentNotifications,
  ] = await Promise.all([
    getDashboardSummary(user.id),
    getFlaggedComments(user.id, filters, page, PAGE_SIZE),
    getFlaggedFilterOptions(user.id),
    countFlaggedComments(user.id, filters),
    countUnreadNotifications(user.id),
    getNotifications(user.id, RECENT_NOTIFICATIONS_LIMIT),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8 sm:px-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xl font-semibold tracking-tight text-foreground">
            대시보드
          </p>
          <p className="text-xs text-muted-foreground">
            위험도별로 플래그된 댓글입니다.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <CommentSearch />
          <NotificationBell
            notifications={recentNotifications}
            unreadCount={unreadNotificationCount}
          />
        </div>
      </header>

      <SummaryTiles summary={summary} />

      <CommentFilters
        categories={filterOptions.categories}
        videos={filterOptions.videos}
        totalCount={summary.total}
        filteredCount={totalCount}
      />

      <CommentsTable rows={rows} />

      {totalPages > 1 && (
        <Pagination currentPage={page} totalPages={totalPages} />
      )}
    </main>
  );
}
