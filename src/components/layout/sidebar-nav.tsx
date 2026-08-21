"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "대시보드" },
  { href: "/comments", label: "댓글 목록" },
  { href: "/review", label: "검토 필요" },
  { href: "/notifications", label: "알림" },
  { href: "/summary", label: "주간 요약" },
];

const BADGE_COUNT_HREF: Record<string, "reviewCount" | "unreadNotificationCount"> = {
  "/review": "reviewCount",
  "/notifications": "unreadNotificationCount",
};

export function SidebarNav({
  reviewCount,
  unreadNotificationCount,
}: {
  reviewCount: number;
  unreadNotificationCount: number;
}) {
  const pathname = usePathname();
  const counts = { reviewCount, unreadNotificationCount };

  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;
        const countKey = BADGE_COUNT_HREF[item.href];
        const count = countKey ? counts[countKey] : 0;

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
            {count > 0 && (
              <span className="font-mono text-xs text-primary">{count}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
