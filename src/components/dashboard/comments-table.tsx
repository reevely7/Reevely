"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight, Inbox } from "lucide-react";

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
  youtubeCommentId: string;
  createdAt: Date;
};

const STATUS_LABELS: Record<string, string> = {
  confirmed: "확정",
  needs_review: "검토 필요",
  reported_false: "오탐 신고됨",
  whitelisted: "화이트리스트",
};

export function CommentsTable({ rows }: { rows: Row[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
    <div className="overflow-x-auto rounded-2xl bg-card">
      <table className="w-full min-w-[720px] border-collapse text-left text-[13px]">
        <thead>
          <tr className="border-b border-border text-[11px] text-muted-foreground">
            <th className="w-8 px-4 py-3 font-medium" />
            <th className="px-2 py-3 font-medium">위험도</th>
            <th className="px-2 py-3 font-medium">댓글</th>
            <th className="px-2 py-3 font-medium">유형</th>
            <th className="px-2 py-3 font-medium">confidence</th>
            <th className="px-2 py-3 font-medium">날짜</th>
            <th className="px-2 py-3 font-medium">상태</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isExpanded = expandedId === row.id;

            return (
              <Fragment key={row.id}>
                <tr
                  onClick={() => setExpandedId(isExpanded ? null : row.id)}
                  className="cursor-pointer border-b border-border last:border-0 hover:bg-accent/50"
                >
                  <td className="px-4 py-3 text-muted-foreground">
                    {isExpanded ? (
                      <ChevronDown className="size-3.5" aria-hidden />
                    ) : (
                      <ChevronRight className="size-3.5" aria-hidden />
                    )}
                  </td>
                  <td className="px-2 py-3">
                    {row.riskLevel && <RiskBadge riskLevel={row.riskLevel} />}
                  </td>
                  <td
                    className="max-w-xs truncate px-2 py-3 text-card-foreground"
                    title={row.text}
                  >
                    {row.text}
                  </td>
                  <td className="px-2 py-3 text-muted-foreground">
                    {row.category ?? "미분류"}
                  </td>
                  <td className="px-2 py-3 font-mono text-muted-foreground tabular-nums">
                    {row.confidence ?? "-"}
                  </td>
                  <td className="px-2 py-3 font-mono text-muted-foreground tabular-nums">
                    {row.createdAt.toLocaleDateString("ko-KR")}
                  </td>
                  <td className="px-2 py-3 text-muted-foreground">
                    {STATUS_LABELS[row.status] ?? row.status}
                  </td>
                </tr>

                {isExpanded && (
                  <tr className="border-b border-border bg-background/60 last:border-0">
                    <td colSpan={7} className="px-4 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1 space-y-2">
                          <p className="text-[13px] text-card-foreground">
                            {row.text}
                          </p>
                          {row.reason && (
                            <p className="text-[12px] text-muted-foreground">
                              {row.reason}
                            </p>
                          )}
                          <a
                            href={`https://www.youtube.com/watch?v=${row.videoId}&lc=${row.youtubeCommentId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block text-[12px] text-primary underline underline-offset-2"
                          >
                            댓글로 이동
                          </a>
                        </div>

                        <div className="shrink-0">
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
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
