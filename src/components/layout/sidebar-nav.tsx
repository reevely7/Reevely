"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { path: "dashboard", label: "대시보드" },
  { path: "comments", label: "댓글 목록" },
  { path: "review", label: "검토 필요" },
  { path: "evidence-archive", label: "증거 보관함" },
  { path: "notifications", label: "알림" },
  { path: "summary", label: "주간 요약" },
];

const BADGE_COUNT_PATH: Record<string, "reviewCount" | "unreadNotificationCount"> = {
  review: "reviewCount",
  notifications: "unreadNotificationCount",
};

export function SidebarNav({
  channelId,
  reviewCount,
  unreadNotificationCount,
}: {
  channelId?: string;
  reviewCount: number;
  unreadNotificationCount: number;
}) {
  const pathname = usePathname();
  const counts = { reviewCount, unreadNotificationCount };

  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const href = channelId ? `/c/${channelId}/${item.path}` : "/mypage";
        const isActive = pathname === href;
        const countKey = BADGE_COUNT_PATH[item.path];
        const count = countKey ? counts[countKey] : 0;

        return (
          <Link
            key={item.path}
            href={href}
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
