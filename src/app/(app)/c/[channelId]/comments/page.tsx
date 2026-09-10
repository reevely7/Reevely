import { CommentFilters } from "@/components/dashboard/comment-filters";
import { CommentSearch } from "@/components/dashboard/comment-search";
import { CommentsTable } from "@/components/dashboard/comments-table";
import { Pagination } from "@/components/dashboard/pagination";
import {
  countFlaggedComments,
  getFlaggedComments,
  getFlaggedFilterOptions,
  type CommentFilters as CommentFiltersType,
} from "@/lib/db/queries/comments";

const PAGE_SIZE = 15;

export default async function CommentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ channelId: string }>;
  searchParams: Promise<{
    risk?: string;
    category?: string;
    status?: string;
    video?: string;
    search?: string;
    author?: string;
    dateFrom?: string;
    dateTo?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const { channelId } = await params;
  const sp = await searchParams;
  const filters: CommentFiltersType = {
    riskLevel: sp.risk as CommentFiltersType["riskLevel"],
    category: sp.category,
    status: sp.status as CommentFiltersType["status"],
    videoId: sp.video,
    search: sp.search,
    author: sp.author,
    dateFrom: sp.dateFrom,
    dateTo: sp.dateTo,
    sort: sp.sort as CommentFiltersType["sort"],
  };
  const page = Math.max(1, Number(sp.page) || 1);

  const [rows, filterOptions, totalCount, allCount] = await Promise.all([
    getFlaggedComments(channelId, filters, page, PAGE_SIZE),
    getFlaggedFilterOptions(channelId),
    countFlaggedComments(channelId, filters),
    countFlaggedComments(channelId, {}),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8 sm:px-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xl font-semibold tracking-tight text-foreground">
            댓글 목록
          </p>
          <p className="text-xs text-muted-foreground">
            위험도별로 플래그된 댓글입니다.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <CommentSearch />
          <CommentSearch paramKey="author" placeholder="작성자 검색" />
        </div>
      </header>

      <CommentFilters
        categories={filterOptions.categories}
        videos={filterOptions.videos}
        totalCount={allCount}
        filteredCount={totalCount}
      />

      <CommentsTable rows={rows} channelId={channelId} />

      {totalPages > 1 && (
        <Pagination currentPage={page} totalPages={totalPages} />
      )}
    </main>
  );
}
