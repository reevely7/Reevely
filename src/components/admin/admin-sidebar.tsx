"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { href: "/admin", label: "대시보드", exact: true },
  { href: "/admin/users", label: "유저 관리" },
  { href: "/admin/channels", label: "채널 연동 관리" },
  { href: "/admin/subscriptions", label: "구독/결제 관리" },
  { href: "/admin/ai-quality", label: "AI 분석 품질 모니터링" },
  { href: "/admin/system", label: "시스템/인프라 운영" },
  { href: "/admin/content", label: "콘텐츠/신고 관리" },
  { href: "/admin/audit-log", label: "감사 로그" },
];

export function AdminSidebar({
  logoutAction,
}: {
  logoutAction: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setIsOpen(false);
  }

  return (
    <>
      <header className="flex items-center justify-between border-b border-sidebar-border bg-sidebar px-4 py-3 md:hidden">
        <Link
          href="/admin"
          className="text-lg font-semibold tracking-tight text-sidebar-foreground"
        >
          Reevely 관리자
        </Link>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="메뉴 열기"
          className="text-sidebar-foreground"
        >
          <Menu className="size-5" aria-hidden />
        </button>
      </header>

      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 -translate-x-full flex-col justify-between bg-sidebar px-4 py-5 text-sidebar-foreground transition-transform duration-200 md:static md:z-auto md:w-60 md:translate-x-0 ${
          isOpen ? "translate-x-0" : ""
        }`}
      >
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <Link href="/admin" className="text-xl font-semibold tracking-tight">
              Reevely 관리자
            </Link>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="메뉴 닫기"
              className="text-muted-foreground md:hidden"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>

          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    isActive
                      ? "bg-sidebar-accent text-sidebar-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <form action={logoutAction} className="border-t border-sidebar-border pt-4">
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="w-full border-sidebar-border bg-transparent text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            로그아웃
          </Button>
        </form>
      </aside>
    </>
  );
}
