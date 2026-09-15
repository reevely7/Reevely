"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/mypage", label: "구독 작성자" },
  { href: "/mypage/subscription", label: "구독 플랜" },
  { href: "/mypage/account", label: "계정/채널" },
  { href: "/mypage/profile", label: "프로필" },
];

export function MypageNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2 border-b border-border pb-4">
      {TABS.map((tab) => {
        const isActive = pathname === tab.href;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
