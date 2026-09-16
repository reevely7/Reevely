"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { FilterSelect } from "@/components/ui/filter-select";

export function VideoSortFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sort = searchParams.get("sort") === "malicious" ? "malicious" : "latest";

  function updateSort(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <FilterSelect
      value={sort}
      onValueChange={updateSort}
      options={[
        { value: "latest", label: "최신순" },
        { value: "malicious", label: "악성 댓글 많은순" },
      ]}
    />
  );
}
