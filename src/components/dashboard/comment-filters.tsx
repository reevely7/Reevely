"use client";

import { ChevronDown } from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

const STATUS_LABELS: Record<string, string> = {
  confirmed: "확정",
  needs_review: "검토 필요",
  reported_false: "오탐 신고됨",
  whitelisted: "화이트리스트",
};

type Props = {
  categories: string[];
  videos: Array<{ videoId: string; videoTitle: string | null }>;
};

function FilterSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...props}
        className="h-8 appearance-none rounded-md border border-border bg-background py-1 pr-7 pl-2 text-sm text-foreground"
      />
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
    </div>
  );
}

export function CommentFilters({ categories, videos }: Props) {
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

  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterSelect
        value={searchParams.get("risk") ?? ""}
        onChange={(e) => updateParam("risk", e.target.value)}
      >
        <option value="">위험도 전체</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </FilterSelect>

      <FilterSelect
        value={searchParams.get("category") ?? ""}
        onChange={(e) => updateParam("category", e.target.value)}
      >
        <option value="">유형 전체</option>
        {categories.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </FilterSelect>

      <FilterSelect
        value={searchParams.get("status") ?? ""}
        onChange={(e) => updateParam("status", e.target.value)}
      >
        <option value="">상태 전체</option>
        {Object.entries(STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </FilterSelect>

      <FilterSelect
        value={searchParams.get("video") ?? ""}
        onChange={(e) => updateParam("video", e.target.value)}
      >
        <option value="">영상 전체</option>
        {videos.map(({ videoId, videoTitle }) => (
          <option key={videoId} value={videoId}>
            {videoTitle ?? videoId}
          </option>
        ))}
      </FilterSelect>

      <FilterSelect
        value={searchParams.get("sort") ?? "newest"}
        onChange={(e) => updateParam("sort", e.target.value)}
      >
        <option value="newest">최신순</option>
        <option value="risk">위험도순</option>
      </FilterSelect>
    </div>
  );
}
