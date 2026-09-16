import Link from "next/link";

import { formatWeekDiff } from "@/lib/format/week-diff";

type DailyCount = { day: string | Date; count: number };

function formatBarDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
}

// DB의 date_trunc('day', ...)는 UTC 자정 기준이라, toISOString처럼 로컬 자정을
// UTC로 변환하면(한국은 UTC+9) 하루가 어긋난다. 로컬 달력 필드로만 키를 만들어야
// DB 쪽 결과와 항상 같은 날짜로 매칭된다.
function toDayKey(day: string | Date): string {
  const date = typeof day === "string" ? new Date(day) : day;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function DailyTrendCard({
  dailyCounts,
  dailyTotalCounts,
  days,
  rangeEnd,
  thisWeekCount,
  lastWeekCount,
  channelId,
}: {
  dailyCounts: DailyCount[];
  dailyTotalCounts: DailyCount[];
  days: number;
  rangeEnd: Date;
  thisWeekCount: number;
  lastWeekCount: number;
  channelId: string;
}) {
  const maliciousByDay = new Map(
    dailyCounts.map((row) => [toDayKey(row.day), row.count]),
  );
  const totalByDay = new Map(
    dailyTotalCounts.map((row) => [toDayKey(row.day), row.count]),
  );

  const bars = Array.from({ length: days }, (_, i) => {
    const date = new Date(rangeEnd);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (days - 1 - i));
    const key = toDayKey(date);
    return {
      total: totalByDay.get(key) ?? 0,
      malicious: maliciousByDay.get(key) ?? 0,
      dateLabel: formatBarDate(date),
    };
  });
  const hasAnyData = bars.some((bar) => bar.total > 0 || bar.malicious > 0);
  const max = Math.max(1, ...bars.map((bar) => Math.max(bar.total, bar.malicious)));

  // 값이 0이면 막대를 아예 안 보이게 하고(0%), 0이 아닌데 너무 작아 안 보일 값만
  // 최소 높이를 준다 — 안 그러면 데이터가 없는 날도 뭔가 있는 것처럼 보인다.
  function barHeightPercent(value: number): number {
    if (value === 0) return 0;
    return Math.max(4, (value / max) * 100);
  }

  return (
    <div className="flex h-full min-h-72 flex-col gap-4 rounded-lg border border-[#CAD6CF] bg-card px-5 py-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-card-foreground">
          최근 {days}일 추이
        </p>
        <Link
          href={`/c/${channelId}/summary`}
          className="text-xs text-primary underline underline-offset-2"
        >
          주간 요약 보기 →
        </Link>
      </div>

      {hasAnyData ? (
        <>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-chart-2" aria-hidden />
              전체 댓글
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[#E2908D]" aria-hidden />
              악성 댓글
            </span>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-1.5 py-2">
            <div className="relative flex flex-1 gap-3">
              <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="border-t border-border/30" />
                ))}
              </div>

              {bars.map((bar, i) => (
                <div
                  key={i}
                  className="relative z-10 flex flex-1 items-end justify-center gap-1.5"
                >
                  <div
                    className="w-full max-w-5 rounded-sm bg-chart-2"
                    style={{ height: `${barHeightPercent(bar.total)}%` }}
                    title={`전체 댓글 ${bar.total}건`}
                  />
                  <div
                    className="w-full max-w-5 rounded-sm bg-[#E2908D]"
                    style={{ height: `${barHeightPercent(bar.malicious)}%` }}
                    title={`악성 댓글 ${bar.malicious}건`}
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              {bars.map((bar, i) => (
                <span
                  key={i}
                  className="flex-1 text-center text-[11px] text-muted-foreground"
                >
                  {bar.dateLabel}
                </span>
              ))}
            </div>
          </div>
        </>
      ) : (
        <p className="flex flex-1 items-center justify-center py-4 text-center text-sm text-muted-foreground">
          최근 7일간 댓글이 없습니다.
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        최근 7일 악성 댓글 {thisWeekCount}건 · 이전 7일 대비{" "}
        {formatWeekDiff(thisWeekCount, lastWeekCount)}
      </p>
    </div>
  );
}
