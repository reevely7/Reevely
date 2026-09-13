import { Archive } from "lucide-react";

import { ArchiveActionButton } from "@/components/comments/archive-action-button";
import { RiskBadge } from "@/components/dashboard/risk-badge";
import { getArchivedComments } from "@/lib/db/queries/comments";

function formatDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
}

export default async function EvidenceArchivePage({
  params,
}: {
  params: Promise<{ channelId: string }>;
}) {
  const { channelId } = await params;
  const archived = await getArchivedComments(channelId);

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8 sm:px-10">
      <header>
        <p className="text-xl font-semibold tracking-tight text-foreground">
          증거 보관함
        </p>
        <p className="text-xs text-muted-foreground">
          확정된 악성 댓글의 증거를 모아두는 공간입니다. 댓글 목록에서
          &quot;증거 보관&quot; 버튼으로 추가할 수 있습니다.
        </p>
      </header>

      {archived.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-card px-6 py-16 text-center">
          <Archive className="size-8 text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">
            보관된 증거가 없습니다.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {archived.map((comment) => (
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
                  {comment.archivedAt && (
                    <span className="font-mono text-xs text-muted-foreground">
                      보관일 {formatDate(comment.archivedAt)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-card-foreground">{comment.text}</p>
                <p className="text-xs text-muted-foreground">
                  작성자: {comment.authorDisplayName ?? "알 수 없음"}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <ArchiveActionButton
                  commentId={comment.id}
                  channelId={channelId}
                  isArchived
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
