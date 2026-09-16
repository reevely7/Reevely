"use client";

import { useRouter } from "next/navigation";
import type { KeyboardEvent, ReactNode } from "react";

export function AuthorTableRow({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  const router = useRouter();

  const navigate = () => router.push(href);
  const handleKeyDown = (event: KeyboardEvent<HTMLTableRowElement>) => {
    if (event.key === "Enter") navigate();
  };

  return (
    <tr
      onClick={navigate}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      className="cursor-pointer border-b border-border/40 border-l-2 border-l-transparent last:border-0 hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:outline-none"
    >
      {children}
    </tr>
  );
}
