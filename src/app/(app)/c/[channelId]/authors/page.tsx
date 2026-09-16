import Link from "next/link";
import { UserRound } from "lucide-react";

import { CommentSearch } from "@/components/dashboard/comment-search";
import { requireChannelOwnership } from "@/lib/auth/require-channel-ownership";
import { searchAuthors } from "@/lib/db/queries/comments";

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
  const results = await searchAuthors(channelId, query, query ? 50 : 20);

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8 sm:px-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xl font-semibold tracking-tight text-foreground">
            작성자 검색
          </p>
          <p className="text-xs text-muted-foreground">
            작성자 이름으로 검색해 댓글 이력을 확인합니다.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <CommentSearch paramKey="q" placeholder="작성자 이름 검색" />
        </div>
      </header>

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
          {!query && (
            <p className="text-xs text-muted-foreground">
              악성 댓글이 많은 순으로 보여줍니다.
            </p>
          )}
          {results.map((author) => {
            const displayName = author.authorDisplayName ?? "알 수 없음";
            const initial =
              displayName.replace(/^@/, "").charAt(0).toUpperCase() || "?";

            return (
              <Link
                key={author.authorChannelId}
                href={`/c/${channelId}/authors/${encodeURIComponent(author.authorChannelId)}`}
                className="flex items-center gap-4 rounded-lg border border-[#CAD6CF] bg-card px-4 py-3 transition-colors hover:bg-accent/50"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-gradient-to-br from-secondary to-background text-sm font-semibold text-primary">
                  {initial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {displayName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    최근 댓글 {formatDate(author.lastCommentAt)}
                  </p>
                </div>
                <span className="rounded-full bg-risk-high-bg px-2.5 py-1 text-xs font-medium text-risk-high">
                  악성 댓글 {author.count}건
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
