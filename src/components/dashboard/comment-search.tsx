"use client";

import { Search } from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type Props = {
  paramKey?: string;
  placeholder?: string;
};

export function CommentSearch({
  paramKey = "search",
  placeholder = "댓글 내용 검색",
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const committedSearch = searchParams.get(paramKey) ?? "";

  const [value, setValue] = useState(committedSearch);
  const [syncedSearch, setSyncedSearch] = useState(committedSearch);

  // 다른 컴포넌트(필터 초기화 등)가 URL을 바꾸면, 렌더 중에 입력값을 맞춘다
  // (useEffect에서 setState하면 불필요한 리렌더가 한 번 더 발생해 지양)
  if (committedSearch !== syncedSearch) {
    setSyncedSearch(committedSearch);
    setValue(committedSearch);
  }

  // 타이핑마다 바로 push하지 않고 300ms 멈춘 뒤에만 반영한다
  useEffect(() => {
    const handle = setTimeout(() => {
      if (value !== (searchParams.get(paramKey) ?? "")) {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
          params.set(paramKey, value);
        } else {
          params.delete(paramKey);
        }
        params.delete("page");
        router.push(`${pathname}?${params.toString()}`);
      }
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="relative w-full sm:w-72">
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-md border border-border bg-background py-2 pr-3 pl-10 text-base text-foreground placeholder:text-muted-foreground"
      />
    </div>
  );
}
