import { redirect } from "next/navigation";

import { CommentFilters } from "@/components/dashboard/comment-filters";
import { CommentsTable } from "@/components/dashboard/comments-table";
import { SummaryTiles } from "@/components/dashboard/summary-tiles";
import {
  getDashboardSummary,
  getFlaggedComments,
  getFlaggedFilterOptions,
  type CommentFilters as CommentFiltersType,
} from "@/lib/db/queries/comments";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    risk?: string;
    category?: string;
    status?: string;
    video?: string;
    sort?: string;
  }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const filters: CommentFiltersType = {
    riskLevel: params.risk as CommentFiltersType["riskLevel"],
    category: params.category,
    status: params.status as CommentFiltersType["status"],
    videoId: params.video,
    sort: params.sort as CommentFiltersType["sort"],
  };

  const [summary, rows, filterOptions] = await Promise.all([
    getDashboardSummary(user.id),
    getFlaggedComments(user.id, filters),
    getFlaggedFilterOptions(user.id),
  ]);

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8 sm:px-10">
      <header>
        <p className="text-xl font-semibold tracking-tight text-foreground">
          대시보드
        </p>
        <p className="text-xs text-muted-foreground">
          위험도별로 플래그된 댓글입니다.
        </p>
      </header>

      <SummaryTiles summary={summary} />

      <CommentFilters
        categories={filterOptions.categories}
        videoIds={filterOptions.videoIds}
      />

      <CommentsTable rows={rows} />
    </main>
  );
}
