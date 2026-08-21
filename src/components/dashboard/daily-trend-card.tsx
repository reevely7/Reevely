import Link from "next/link";

import { formatWeekDiff } from "@/lib/format/week-diff";

type DailyCount = { day: string | Date; count: number };

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

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
    return {
      count: countsByDay.get(date.toISOString().slice(0, 10)) ?? 0,
      weekday: WEEKDAY_LABELS[date.getDay()],
    };
  });
  const max = Math.max(1, ...bars.map((bar) => bar.count));

  return (
    <div className="flex h-full min-h-72 flex-col gap-4 rounded-2xl bg-card px-5 py-4">
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

      <div className="flex min-h-0 flex-1 gap-3 py-2">
        {bars.map((bar, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="flex w-full flex-1 items-end">
              <div
                className="w-full rounded-sm bg-primary/70"
                style={{ height: `${Math.max(4, (bar.count / max) * 100)}%` }}
                title={`${bar.count}건`}
              />
            </div>
            <span className="text-[11px] text-muted-foreground">
              {bar.weekday}
            </span>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        이번 주 {thisWeekCount}건 · 지난주 대비{" "}
        {formatWeekDiff(thisWeekCount, lastWeekCount)}
      </p>
    </div>
  );
}
