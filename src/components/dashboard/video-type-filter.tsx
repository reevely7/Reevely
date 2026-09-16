"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { FilterSelect } from "@/components/ui/filter-select";

export function VideoTypeFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateType(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("type", value);
    else params.delete("type");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <FilterSelect
      value={searchParams.get("type") ?? ""}
      onValueChange={updateType}
      options={[
        { value: "", label: "전체" },
        { value: "video", label: "동영상" },
        { value: "shorts", label: "쇼츠" },
      ]}
    />
  );
}
