"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

import { DateRangeFilter } from "@/components/dashboard/date-range-filter";
import { FilterSelect } from "@/components/ui/filter-select";

const STATUS_LABELS: Record<string, string> = {
  confirmed: "검토 완료",
  needs_review: "검토 필요",
};

type Props = {
  categories: string[];
  totalCount: number;
  filteredCount: number;
};

export function CommentFilters({
  categories,
  totalCount,
  filteredCount,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    // 필터가 바뀌면 결과 수가 달라지므로 페이지네이션은 1페이지로 리셋
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  function updateDateRange(dateFrom: string, dateTo: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (dateFrom) params.set("dateFrom", dateFrom);
    else params.delete("dateFrom");
    if (dateTo) params.set("dateTo", dateTo);
    else params.delete("dateTo");
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  const hasActiveFilters = Boolean(
    searchParams.get("risk") ||
      searchParams.get("category") ||
      searchParams.get("status") ||
      searchParams.get("platform") ||
      searchParams.get("video") ||
      searchParams.get("search") ||
      searchParams.get("dateFrom") ||
      searchParams.get("dateTo"),
  );

  function handleReset() {
    router.push(pathname);
  }

  const hideOriginal = searchParams.get("hideOriginal") !== "0";

  function setHideOriginal(next: boolean) {
    const params = new URLSearchParams(searchParams.toString());
    if (next) {
      params.delete("hideOriginal");
    } else {
      params.set("hideOriginal", "0");
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect
          value={searchParams.get("risk") ?? ""}
          onValueChange={(value) => updateParam("risk", value)}
          options={[
            { value: "", label: "위험도 전체" },
            { value: "high", label: "높음" },
            { value: "medium", label: "보통" },
            { value: "low", label: "낮음" },
          ]}
        />

        <FilterSelect
          value={searchParams.get("category") ?? ""}
          onValueChange={(value) => updateParam("category", value)}
          options={[
            { value: "", label: "유형 전체" },
            ...categories.map((category) => ({
              value: category,
              label: category,
            })),
          ]}
        />

        <FilterSelect
          value={searchParams.get("status") ?? ""}
          onValueChange={(value) => updateParam("status", value)}
          options={[
            { value: "", label: "상태 전체" },
            ...Object.entries(STATUS_LABELS).map(([value, label]) => ({
              value,
              label,
            })),
          ]}
        />

        <DateRangeFilter
          dateFrom={searchParams.get("dateFrom") ?? ""}
          dateTo={searchParams.get("dateTo") ?? ""}
          onChange={updateDateRange}
        />

        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            필터 초기화
          </button>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        전체 {totalCount}건 중 {filteredCount}건 표시 중
      </p>

      <div className="relative -top-3 flex justify-end">
        <div className="inline-flex w-fit rounded-full border border-border bg-background p-1">
          <button
            type="button"
            onClick={() => setHideOriginal(false)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              !hideOriginal
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            원문 표시
          </button>
          <button
            type="button"
            onClick={() => setHideOriginal(true)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              hideOriginal
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            원문 숨김
          </button>
        </div>
      </div>
    </div>
  );
}
