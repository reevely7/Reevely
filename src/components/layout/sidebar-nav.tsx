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
            className={`relative flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
              isActive
                ? "bg-[#547792]/25 text-[#ECEFCA]"
                : "text-[#94B4C1] hover:bg-[#547792]/15 hover:text-[#ECEFCA]"
            }`}
          >
            {isActive && (
              <span
                aria-hidden
                className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-[#547792]"
              />
            )}
            <span>{item.label}</span>
            {item.href === "/review" && reviewCount > 0 && (
              <span className="font-mono text-xs text-[#547792]">
                {reviewCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
