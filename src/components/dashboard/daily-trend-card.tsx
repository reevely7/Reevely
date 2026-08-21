import Link from "next/link";

import { formatWeekDiff } from "@/lib/format/week-diff";

type DailyCount = { day: string | Date; count: number };

function toDayKey(day: string | Date): string {
  const date = typeof day === "string" ? new Date(day) : day;
  return date.toISOString().slice(0, 10);
}

export function DailyTrendCard({
  dailyCounts,
  days,
  thisWeekCount,
  lastWeekCount,
}: {
  dailyCounts: DailyCount[];
  days: number;
  thisWeekCount: number;
  lastWeekCount: number;
}) {
  const countsByDay = new Map(
    dailyCounts.map((row) => [toDayKey(row.day), row.count]),
  );

  const bars = Array.from({ length: days }, (_, i) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (days - 1 - i));
    return countsByDay.get(date.toISOString().slice(0, 10)) ?? 0;
  });
  const max = Math.max(1, ...bars);

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-card px-5 py-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-card-foreground">
          최근 {days}일 위험 댓글 추이
        </p>
        <Link
          href="/summary"
          className="text-xs text-primary underline underline-offset-2"
        >
          주간 요약 보기 →
        </Link>
      </div>

      <div className="flex h-16 items-end gap-1">
        {bars.map((count, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm bg-primary/70"
            style={{ height: `${Math.max(4, (count / max) * 100)}%` }}
            title={`${count}건`}
          />
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        이번 주 {thisWeekCount}건 · 지난주 대비{" "}
        {formatWeekDiff(thisWeekCount, lastWeekCount)}
      </p>
    </div>
  );
}
