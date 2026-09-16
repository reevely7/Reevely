import { ChevronRight, UserRound } from "lucide-react";

import { AuthorTableRow } from "@/components/authors/author-table-row";
import { CommentSearch } from "@/components/dashboard/comment-search";
import { requireChannelOwnership } from "@/lib/auth/require-channel-ownership";
import {
  countRepeatAuthors,
  countTotalMaliciousAuthors,
  searchAuthors,
} from "@/lib/db/queries/comments";

const DEFAULT_LIST_LIMIT = 30;
const RECENT_ACTIVITY_DAYS = 7;

function formatDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
}

export default async function AuthorSearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ channelId: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { channelId } = await params;
  await requireChannelOwnership(channelId);
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const now = new Date();
  const sevenDaysAgo = new Date(
    now.getTime() - RECENT_ACTIVITY_DAYS * 24 * 60 * 60 * 1000,
  );

  const [results, repeatAuthorCount, totalAuthorCount] = await Promise.all([
    searchAuthors(channelId, query, query ? 50 : DEFAULT_LIST_LIMIT),
    countRepeatAuthors(channelId),
    countTotalMaliciousAuthors(channelId),
  ]);

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8 sm:px-10">
      <header className="flex flex-col gap-1">
        <p className="text-xl font-semibold tracking-tight text-foreground">
          작성자 검색
        </p>
        <p className="text-xs text-muted-foreground">
          작성자 이름으로 검색해 댓글 이력을 확인합니다.
        </p>
      </header>

      <CommentSearch
        paramKey="q"
        placeholder="작성자 이름 검색"
        widthClassName="sm:w-full"
      />

      <p className="rounded-2xl border border-[#CAD6CF] bg-card px-6 py-5 text-sm leading-relaxed text-foreground">
        지금까지 감지된 악성 댓글 작성자는 총{" "}
        <span className="text-base font-bold text-status-confirmed">
          {totalAuthorCount.toLocaleString()}명
        </span>
        이고, 그중{" "}
        <span className="text-base font-bold text-risk-high">
          {repeatAuthorCount.toLocaleString()}명
        </span>
        이 2건 이상 반복해서 악성 댓글을 남겼어요.
      </p>

      {results.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-card px-6 py-16 text-center">
          <UserRound className="size-8 text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">
            {query
              ? `"${query}"와(과) 일치하는 작성자가 없습니다.`
              : "아직 악성 댓글을 남긴 작성자가 없습니다."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {query ? "" : "악성 댓글이 많은 순으로 보여줍니다."}
            </p>
            <p className="text-xs text-muted-foreground">
              {query
                ? `검색 결과 ${results.length}명`
                : `총 ${totalAuthorCount.toLocaleString()}명의 작성자`}
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[#CAD6CF] bg-card">
            <table className="w-full min-w-[720px] border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-border bg-[#EEEFF1] text-[13px] text-muted-foreground">
                  <th className="py-4 pr-0 pl-6 font-semibold">작성자</th>
                  <th className="py-4 pr-2 pl-0 font-semibold whitespace-nowrap">
                    최근 댓글
                  </th>
                  <th className="px-2 py-4 font-semibold whitespace-nowrap">
                    총 댓글
                  </th>
                  <th className="py-4 pr-2 pl-12 font-semibold">상태</th>
                  <th className="px-2 py-4 font-semibold whitespace-nowrap">
                    악성 댓글
                  </th>
                  <th className="w-8 px-2 py-4" aria-hidden />
                </tr>
              </thead>
              <tbody>
                {results.map((author) => {
                  const displayName = author.authorDisplayName ?? "알 수 없음";
                  const initial =
                    displayName.replace(/^@/, "").charAt(0).toUpperCase() ||
                    "?";
                  const isRepeatAuthor = author.count >= 2;
                  const isRecentlyActive =
                    author.lastCommentAt >= sevenDaysAgo;

                  return (
                    <AuthorTableRow
                      key={author.authorChannelId}
                      href={`/c/${channelId}/authors/${encodeURIComponent(author.authorChannelId)}`}
                    >
                      <td className="py-3 pr-0 pl-6">
                        <div className="flex items-center gap-2.5">
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-secondary text-xs font-semibold text-primary">
                            {initial}
                          </span>
                          <span className="truncate font-semibold text-card-foreground">
                            {displayName}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pr-2 pl-0 whitespace-nowrap text-muted-foreground">
                        {formatDate(author.lastCommentAt)}
                      </td>
                      <td className="px-2 py-3 text-card-foreground">
                        {author.totalCount}건
                      </td>
                      <td className="py-3 pr-2 pl-12">
                        <div className="flex flex-wrap gap-1.5">
                          {isRepeatAuthor && (
                            <span className="rounded-full bg-risk-high-bg px-2 py-0.5 text-xs font-medium whitespace-nowrap text-risk-high">
                              반복 작성
                            </span>
                          )}
                          {isRecentlyActive && (
                            <span className="rounded-full bg-status-confirmed-bg px-2 py-0.5 text-xs font-medium whitespace-nowrap text-status-confirmed">
                              최근 활동
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-3">
                        <span className="rounded-full bg-risk-high-bg px-2.5 py-1 text-xs font-medium whitespace-nowrap text-risk-high">
                          악성 댓글 {author.count}건
                        </span>
                      </td>
                      <td className="px-2 py-3 text-muted-foreground">
                        <ChevronRight className="size-3.5" aria-hidden />
                      </td>
                    </AuthorTableRow>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
