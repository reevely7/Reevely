import { CommentFilters } from "@/components/dashboard/comment-filters";
import { CommentSearch } from "@/components/dashboard/comment-search";
import { CommentsTable } from "@/components/dashboard/comments-table";
import { Pagination } from "@/components/dashboard/pagination";
import { requireChannelOwnership } from "@/lib/auth/require-channel-ownership";
import {
  countFlaggedComments,
  getFlaggedComments,
  getFlaggedFilterOptions,
  MAX_BULK_SELECTION,
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
    platform?: string;
    video?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    sort?: string;
    page?: string;
    hideOriginal?: string;
  }>;
}) {
  const { channelId } = await params;
  await requireChannelOwnership(channelId);
  const sp = await searchParams;
  const hideOriginal = sp.hideOriginal !== "0";
  const filters: CommentFiltersType = {
    riskLevel: sp.risk as CommentFiltersType["riskLevel"],
    category: sp.category,
    status: sp.status as CommentFiltersType["status"],
    platform: sp.platform as CommentFiltersType["platform"],
    videoId: sp.video,
    search: sp.search,
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
            AI가 분류한 댓글을 한눈에 확인하고 관리합니다.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <CommentSearch placeholder="댓글 내용 검색" widthClassName="sm:w-96" />
        </div>
      </header>

      <div className="flex flex-col gap-1.5">
        <CommentFilters
          categories={filterOptions.categories}
          totalCount={allCount}
          filteredCount={totalCount}
        />

        <CommentsTable
          rows={rows}
          channelId={channelId}
          hideOriginal={hideOriginal}
          totalCount={totalCount}
          maxBulkSelection={MAX_BULK_SELECTION}
        />
      </div>

      {totalPages > 1 && (
        <Pagination currentPage={page} totalPages={totalPages} />
      )}
    </main>
  );
}
