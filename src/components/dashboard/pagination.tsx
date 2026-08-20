"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

type Props = {
  currentPage: number;
  totalPages: number;
};

export function Pagination({ currentPage, totalPages }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (page <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(page));
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center justify-center gap-3">
      <button
        type="button"
        onClick={() => goToPage(currentPage - 1)}
        disabled={currentPage <= 1}
        className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-40"
      >
        이전
      </button>
      <span className="font-mono text-xs text-muted-foreground tabular-nums">
        {currentPage} / {totalPages}
      </span>
      <button
        type="button"
        onClick={() => goToPage(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-40"
      >
        다음
      </button>
    </div>
  );
}
