import Link from "next/link";
import { ArrowLeft, Inbox } from "lucide-react";
import { redirect } from "next/navigation";

import { AuthorCommentFeed } from "@/components/authors/author-comment-feed";
import { RiskBadge } from "@/components/dashboard/risk-badge";
import {
  getCommentsByAuthor,
  type CommentRiskLevel,
} from "@/lib/db/queries/comments";
import { createClient } from "@/lib/supabase/server";

function formatDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
}

const RISK_BAR_CLASSES: Record<CommentRiskLevel, string> = {
  high: "bg-risk-high",
  medium: "bg-risk-medium",
  low: "bg-risk-low",
};

export default async function AuthorPage({
  params,
}: {
  params: Promise<{ authorChannelId: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { authorChannelId } = await params;
  const comments = await getCommentsByAuthor(
    user.id,
    decodeURIComponent(authorChannelId),
  );
  const displayName = comments[0]?.authorDisplayName ?? "알 수 없음";
  const initial = displayName.replace(/^@/, "").charAt(0).toUpperCase() || "?";

  const riskCounts: Record<CommentRiskLevel, number> = {
    high: 0,
    medium: 0,
    low: 0,
  };
  const categoryCounts = new Map<string, number>();
  for (const comment of comments) {
    if (comment.riskLevel) riskCounts[comment.riskLevel] += 1;
    if (comment.category) {
      categoryCounts.set(
        comment.category,
        (categoryCounts.get(comment.category) ?? 0) + 1,
      );
    }
  }
  const topCategories = Array.from(categoryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([category]) => category);
  const firstSeen = comments[comments.length - 1]?.createdAt;

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8 sm:px-10">
      <Link
        href="/dashboard"
        className="flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        대시보드로 돌아가기
      </Link>

      {comments.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-card px-6 py-16 text-center">
          <Inbox className="size-8 text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">
            해당 작성자의 댓글을 찾을 수 없습니다.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] lg:items-start">
          <aside className="flex flex-col gap-6 border-b border-border pb-7 lg:sticky lg:top-8 lg:border-b-0 lg:border-r lg:pr-8 lg:pb-0">
            <div className="flex items-center gap-4">
              <div className="flex size-16 shrink-0 items-center justify-center rounded-full border border-border bg-gradient-to-br from-secondary to-background text-2xl font-semibold text-primary">
                {initial}
              </div>
              <div className="min-w-0">
                <p
                  className="truncate text-xl font-semibold text-foreground"
                  title={displayName}
                >
                  {displayName}
                </p>
                {firstSeen && (
                  <p className="font-mono text-xs text-muted-foreground">
                    추적 시작 {formatDate(firstSeen)}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {(["high", "medium", "low"] as const).map((level) => (
                <div key={level} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <RiskBadge riskLevel={level} />
                    <span className="font-mono text-muted-foreground">
                      {riskCounts[level]}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-border">
                    <div
                      className={`h-full ${RISK_BAR_CLASSES[level]}`}
                      style={{
                        width: comments.length
                          ? `${(riskCounts[level] / comments.length) * 100}%`
                          : "0%",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {topCategories.length > 0 && (
              <div className="flex flex-col gap-2.5 border-t border-border pt-5">
                <p className="font-mono text-xs text-muted-foreground">
                  주요 유형
                </p>
                <div className="flex flex-wrap gap-2">
                  {topCategories.map((category) => (
                    <span
                      key={category}
                      className="rounded-full border border-border px-2.5 py-1 text-sm text-muted-foreground"
                    >
                      {category}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </aside>

          <div className="pt-7 lg:pt-0">
            <AuthorCommentFeed
              comments={comments}
              displayName={displayName}
              initial={initial}
            />
          </div>
        </div>
      )}
    </main>
  );
}
