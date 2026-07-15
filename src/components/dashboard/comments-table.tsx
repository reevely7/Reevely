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
      <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card px-6 py-16 text-center">
        <Inbox className="size-8 text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">
          조건에 맞는 댓글이 없습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-border text-left text-[11px] text-muted-foreground">
            <th className="px-3 py-1.5 font-medium">위험도</th>
            <th className="px-3 py-1.5 font-medium">유형</th>
            <th className="px-3 py-1.5 font-medium">댓글</th>
            <th className="px-3 py-1.5 font-medium">확신도</th>
            <th className="px-3 py-1.5 font-medium">판정 근거</th>
            <th className="px-3 py-1.5 font-medium">영상</th>
            <th className="px-3 py-1.5 font-medium">작성일</th>
            <th className="px-3 py-1.5 font-medium">조치</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-b border-border last:border-0 align-top"
            >
              <td className="px-3 py-2">
                {row.riskLevel && <RiskBadge riskLevel={row.riskLevel} />}
              </td>
              <td className="px-3 py-2 text-card-foreground">
                {row.category}
              </td>
              <td
                className="max-w-xs px-3 py-2 text-card-foreground"
                title={row.text}
              >
                <span className="line-clamp-2">{row.text}</span>
              </td>
              <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                {row.confidence}
              </td>
              <td
                className="max-w-xs px-3 py-2 text-xs text-muted-foreground"
                title={row.reason ?? undefined}
              >
                <span className="line-clamp-2">{row.reason}</span>
              </td>
              <td className="px-3 py-2">
                <a
                  href={`https://www.youtube.com/watch?v=${row.videoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2"
                >
                  영상 보기
                </a>
              </td>
              <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                {row.createdAt.toLocaleDateString("ko-KR")}
              </td>
              <td className="px-3 py-2">
                {row.status === "reported_false" ? (
                  <span className="text-xs text-muted-foreground">
                    오탐 신고됨
                  </span>
                ) : (
                  <StatusActionButton
                    commentId={row.id}
                    status="reported_false"
                    label="오탐 신고"
                  />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
