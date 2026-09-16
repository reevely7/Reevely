"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Archive,
  BarChart3,
  Bell,
  LayoutDashboard,
  MessageSquare,
  ShieldCheck,
  UserRound,
} from "lucide-react";

const NAV_ITEMS = [
  { path: "dashboard", label: "대시보드", icon: LayoutDashboard },
  { path: "comments", label: "댓글 목록", icon: MessageSquare },
  { path: "authors", label: "작성자 검색", icon: UserRound },
  { path: "review", label: "검토 필요", icon: ShieldCheck },
  { path: "evidence-archive", label: "증거 보관함", icon: Archive },
  { path: "notifications", label: "알림", icon: Bell },
  { path: "summary", label: "주간 요약", icon: BarChart3 },
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
            className={`flex items-center justify-between rounded-lg pl-[30px] pr-3 py-2.5 text-sm font-semibold transition-colors ${
              isActive
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
            }`}
          >
            <span className="flex items-center gap-[22px]">
              <item.icon className="size-4 shrink-0" aria-hidden />
              <span>{item.label}</span>
            </span>
            {count > 0 && (
              <span className="rounded-full bg-secondary px-2 py-0.5 font-mono text-xs text-secondary-foreground">
                {count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
