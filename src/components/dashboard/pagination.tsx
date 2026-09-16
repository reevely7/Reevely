"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

type Props = {
  currentPage: number;
  totalPages: number;
};

const SIBLINGS = 1;
const MAX_WITHOUT_ELLIPSIS = 9;

function getPageItems(currentPage: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= MAX_WITHOUT_ELLIPSIS) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: number[] = [];
  for (let page = 1; page <= totalPages; page++) {
    if (
      page === 1 ||
      page === totalPages ||
      (page >= currentPage - SIBLINGS && page <= currentPage + SIBLINGS)
    ) {
      pages.push(page);
    }
  }

  const items: (number | "ellipsis")[] = [];
  let prev = 0;
  for (const page of pages) {
    if (prev && page - prev > 1) items.push("ellipsis");
    items.push(page);
    prev = page;
  }
  return items;
}

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

  const items = getPageItems(currentPage, totalPages);

  return (
    <div className="flex items-center justify-center gap-1.5">
      <button
        type="button"
        onClick={() => goToPage(currentPage - 1)}
        disabled={currentPage <= 1}
        aria-label="이전 페이지"
        className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-40"
      >
        이전
      </button>

      {items.map((item, index) =>
        item === "ellipsis" ? (
          <span
            key={`ellipsis-${index}`}
            className="px-1 text-sm text-muted-foreground"
          >
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => goToPage(item)}
            aria-current={item === currentPage ? "page" : undefined}
            className={`flex size-8 items-center justify-center rounded-md text-sm font-medium tabular-nums ${
              item === currentPage
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-background text-foreground hover:bg-accent"
            }`}
          >
            {item}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => goToPage(currentPage + 1)}
        disabled={currentPage >= totalPages}
        aria-label="다음 페이지"
        className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-40"
      >
        다음
      </button>
    </div>
  );
}
