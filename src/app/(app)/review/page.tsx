import { CheckCircle2 } from "lucide-react";
import { redirect } from "next/navigation";

import { StatusActionButton } from "@/components/comments/status-action-button";
import { RiskBadge } from "@/components/dashboard/risk-badge";
import { getReviewQueue } from "@/lib/db/queries/comments";
import { createClient } from "@/lib/supabase/server";

export default async function ReviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const queue = await getReviewQueue(user.id);

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8 sm:px-10">
      <header>
        <p className="text-xl font-semibold tracking-tight text-foreground">
          검토 필요
        </p>
        <p className="text-xs text-muted-foreground">
          AI가 확신하지 못한 댓글입니다. 직접 확인해서 확정해 주세요.
        </p>
      </header>

      {queue.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-card px-6 py-16 text-center">
          <CheckCircle2 className="size-8 text-risk-low" aria-hidden />
          <p className="text-sm text-muted-foreground">
            검토할 댓글이 없습니다.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {queue.map((comment) => (
            <div
              key={comment.id}
              className="flex flex-col gap-3 rounded-2xl bg-card px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  {comment.riskLevel && (
                    <RiskBadge riskLevel={comment.riskLevel} />
                  )}
                  <span className="text-xs text-muted-foreground">
                    {comment.category}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    confidence {comment.confidence}
                  </span>
                </div>
                <p className="text-sm text-card-foreground">{comment.text}</p>
                <p className="text-xs text-muted-foreground">
                  작성자: {comment.authorDisplayName ?? "알 수 없음"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {comment.reason}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <StatusActionButton
                  commentId={comment.id}
                  status="confirmed"
                  label="악성 맞음"
                  variant="default"
                />
                <StatusActionButton
                  commentId={comment.id}
                  status="whitelisted"
                  label="아님"
                  variant="outline"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
