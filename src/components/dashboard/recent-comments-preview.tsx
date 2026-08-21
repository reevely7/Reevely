import { Inbox } from "lucide-react";
import Link from "next/link";

import { RiskBadge } from "@/components/dashboard/risk-badge";

type Row = {
  id: string;
  text: string;
  riskLevel: string | null;
  category: string | null;
  createdAt: Date;
};

function formatDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
}

export function RecentCommentsPreview({ rows }: { rows: Row[] }) {
  return (
    <div className="rounded-2xl bg-card px-5 py-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-card-foreground">
          최근 위험 댓글
        </p>
        <Link
          href="/comments"
          className="text-xs text-primary underline underline-offset-2"
        >
          전체 보기 →
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <Inbox className="size-6 text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">
            아직 플래그된 댓글이 없습니다.
          </p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {rows.map((row) => (
            <div key={row.id} className="flex items-center gap-3 py-2.5">
              {row.riskLevel && <RiskBadge riskLevel={row.riskLevel} />}
              <p
                className="min-w-0 flex-1 truncate text-[13px] text-card-foreground"
                title={row.text}
              >
                {row.text}
              </p>
              <span className="shrink-0 text-xs text-muted-foreground">
                {row.category ?? "미분류"}
              </span>
              <span className="shrink-0 font-mono text-xs text-muted-foreground">
                {formatDate(row.createdAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
