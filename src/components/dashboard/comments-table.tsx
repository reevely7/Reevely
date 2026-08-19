import { Inbox } from "lucide-react";

import { StatusActionButton } from "@/components/comments/status-action-button";
import { RiskBadge } from "@/components/dashboard/risk-badge";

type Row = {
  id: string;
  text: string;
  riskLevel: string | null;
  category: string | null;
  confidence: string | null;
  reason: string | null;
  status: string;
  videoId: string;
  createdAt: Date;
};

export function CommentsTable({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl bg-card px-6 py-16 text-center">
        <Inbox className="size-8 text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">
          조건에 맞는 댓글이 없습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((row) => (
        <div key={row.id} className="rounded-2xl bg-card px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-1.5">
              <p
                className="line-clamp-2 text-[13px] text-card-foreground"
                title={row.text}
              >
                {row.text}
              </p>
              <p className="font-mono text-[11px] text-muted-foreground">
                {row.category ?? "미분류"} · confidence {row.confidence ?? "-"}{" "}
                · {row.createdAt.toLocaleDateString("ko-KR")}
              </p>
              {row.reason && (
                <p
                  className="line-clamp-2 text-[11px] text-muted-foreground"
                  title={row.reason}
                >
                  {row.reason}
                </p>
              )}
              <a
                href={`https://www.youtube.com/watch?v=${row.videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-[11px] text-primary underline underline-offset-2"
              >
                영상 보기
              </a>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-2">
              {row.riskLevel && <RiskBadge riskLevel={row.riskLevel} />}
              {row.status === "reported_false" ? (
                <span className="text-[11px] text-muted-foreground">
                  오탐 신고됨
                </span>
              ) : (
                <StatusActionButton
                  commentId={row.id}
                  status="reported_false"
                  label="오탐 신고"
                />
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
