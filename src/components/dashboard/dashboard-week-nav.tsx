"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatParam(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatDisplay(date: Date): string {
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
}

// 캘린더로 임의 날짜를 고르게 하면 "클릭한 날짜가 시작인지 끝인지"가 헷갈리고,
// 시작일 기준으로 하면 최근 날짜를 고를 때 범위가 미래로 넘어가 버린다.
// 그래서 달력 대신 이전/다음 7일 단위 이동만 제공한다 — 항상 유효한 7일 범위가 보장된다.
export function DashboardWeekNav({
  rangeStart,
  rangeEnd,
}: {
  rangeStart: Date;
  rangeEnd: Date;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isCurrentWeek = formatParam(rangeEnd) >= formatParam(new Date());

  function goTo(date: Date) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("to", formatParam(date));
    router.push(`${pathname}?${params.toString()}`);
  }

  function navigate(deltaDays: number) {
    const next = new Date(rangeEnd);
    next.setDate(next.getDate() + deltaDays);
    // +7일씩 이동하다 보면 오늘을 건너뛰어 미래로 넘어갈 수 있어, 오늘을 넘지 않게 고정한다.
    const today = new Date();
    if (formatParam(next) > formatParam(today)) {
      next.setTime(today.getTime());
    }
    goTo(next);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => navigate(-7)}
        aria-label="이전 7일"
        className="flex size-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden />
      </button>

      <span className="min-w-40 text-center text-xs text-muted-foreground">
        {formatDisplay(rangeStart)} - {formatDisplay(rangeEnd)}
      </span>

      <button
        type="button"
        onClick={() => navigate(7)}
        disabled={isCurrentWeek}
        aria-label="다음 7일"
        className="flex size-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-card disabled:hover:text-muted-foreground"
      >
        <ChevronRight className="size-4" aria-hidden />
      </button>

      <button
        type="button"
        onClick={() => goTo(new Date())}
        disabled={isCurrentWeek}
        aria-label="오늘로 이동"
        title="오늘로 이동"
        className="flex size-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-card disabled:hover:text-muted-foreground"
      >
        <RotateCcw className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}
