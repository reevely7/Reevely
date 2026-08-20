"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

const STATUS_LABELS: Record<string, string> = {
  confirmed: "확정",
  needs_review: "검토 필요",
  reported_false: "오탐 신고됨",
  whitelisted: "화이트리스트",
};

type Props = {
  categories: string[];
  videoIds: string[];
};

export function CommentFilters({ categories, videoIds }: Props) {
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

  const selectClassName =
    "h-8 rounded-md border border-border bg-background px-2 text-sm text-foreground";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        className={selectClassName}
        value={searchParams.get("risk") ?? ""}
        onChange={(e) => updateParam("risk", e.target.value)}
      >
        <option value="">위험도 전체</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>

      <select
        className={selectClassName}
        value={searchParams.get("category") ?? ""}
        onChange={(e) => updateParam("category", e.target.value)}
      >
        <option value="">유형 전체</option>
        {categories.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>

      <select
        className={selectClassName}
        value={searchParams.get("status") ?? ""}
        onChange={(e) => updateParam("status", e.target.value)}
      >
        <option value="">상태 전체</option>
        {Object.entries(STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      <select
        className={selectClassName}
        value={searchParams.get("video") ?? ""}
        onChange={(e) => updateParam("video", e.target.value)}
      >
        <option value="">영상 전체</option>
        {videoIds.map((videoId) => (
          <option key={videoId} value={videoId}>
            {videoId}
          </option>
        ))}
      </select>

      <select
        className={selectClassName}
        value={searchParams.get("sort") ?? "newest"}
        onChange={(e) => updateParam("sort", e.target.value)}
      >
        <option value="newest">최신순</option>
        <option value="risk">위험도순</option>
      </select>
    </div>
  );
}
