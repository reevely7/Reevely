"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "대시보드" },
  { href: "/review", label: "검토 필요" },
  { href: "/settings", label: "설정" },
];

export function SidebarNav({ reviewCount }: { reviewCount: number }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
              isActive
                ? "bg-sidebar-accent text-primary"
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
            }`}
          >
            <span>{item.label}</span>
            {item.href === "/review" && reviewCount > 0 && (
              <span className="font-mono text-xs text-primary">
                {reviewCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
