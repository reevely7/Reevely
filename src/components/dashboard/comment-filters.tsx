"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

import { FilterSelect } from "@/components/ui/filter-select";

const STATUS_LABELS: Record<string, string> = {
  confirmed: "확정",
  needs_review: "검토 필요",
  reported_false: "오탐 신고됨",
  whitelisted: "화이트리스트",
};

type Props = {
  categories: string[];
  videos: Array<{ videoId: string; videoTitle: string | null }>;
  totalCount: number;
  filteredCount: number;
};

export function CommentFilters({
  categories,
  videos,
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

  const hasActiveFilters = Boolean(
    searchParams.get("risk") ||
      searchParams.get("category") ||
      searchParams.get("status") ||
      searchParams.get("video") ||
      searchParams.get("search") ||
      (searchParams.get("sort") && searchParams.get("sort") !== "newest"),
  );

  function handleReset() {
    router.push(pathname);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect
          value={searchParams.get("risk") ?? ""}
          onValueChange={(value) => updateParam("risk", value)}
          options={[
            { value: "", label: "위험도 전체" },
            { value: "high", label: "High" },
            { value: "medium", label: "Medium" },
            { value: "low", label: "Low" },
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

        <FilterSelect
          value={searchParams.get("video") ?? ""}
          onValueChange={(value) => updateParam("video", value)}
          options={[
            { value: "", label: "영상 전체" },
            ...videos.map(({ videoId, videoTitle }) => ({
              value: videoId,
              label: videoTitle ?? videoId,
            })),
          ]}
        />

        <FilterSelect
          value={searchParams.get("sort") ?? "newest"}
          onValueChange={(value) => updateParam("sort", value)}
          options={[
            { value: "newest", label: "최신순" },
            { value: "risk", label: "위험도순" },
          ]}
        />

        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleReset}
            className="ml-2 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            필터 초기화
          </button>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        전체 {totalCount}건 중 {filteredCount}건 표시 중
      </p>
    </div>
  );
}
