"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";

import { LogoutButton } from "@/components/auth/logout-button";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { SyncCountdown } from "@/components/layout/sync-countdown";
import { formatClockTime } from "@/lib/format/clock-time";

type Channel = {
  channelTitle: string;
  thumbnailUrl: string | null;
  lastSyncedAt: Date | null;
  latestVideoPublishedAt: Date | null;
};

export function AppSidebar({
  channel,
  reviewCount,
  nextSyncAt,
}: {
  channel: Channel;
  reviewCount: number;
  nextSyncAt: Date;
}) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // 페이지 이동하면 모바일 드로어는 자동으로 닫는다 (레이아웃이 라우트
  // 전환 사이에 유지되는 공유 레이아웃이라 상태가 저절로 리셋되지 않음).
  // 렌더링 중 이전 pathname과 비교해 리셋 — useEffect 안에서 setState하는
  // 것보다 React가 권장하는 방식.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setIsOpen(false);
  }

  return (
    <>
      <header className="flex items-center justify-between border-b border-sidebar-border bg-sidebar px-4 py-3 md:hidden">
        <Link
          href="/dashboard"
          className="text-lg font-semibold tracking-tight text-sidebar-foreground"
        >
          Reevely
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
            <Link
              href="/dashboard"
              className="text-xl font-semibold tracking-tight"
            >
              Reevely
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

          <SidebarNav reviewCount={reviewCount} />
        </div>

        <div className="flex flex-col gap-3 border-t border-sidebar-border pt-4">
          <div className="flex items-center gap-2">
            {channel.thumbnailUrl && (
              <Image
                src={channel.thumbnailUrl}
                alt={channel.channelTitle}
                width={28}
                height={28}
                className="rounded-full"
              />
            )}
            <p className="truncate text-xs text-muted-foreground">
              {channel.channelTitle}
            </p>
          </div>

          {channel.lastSyncedAt && (
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              최근 댓글 업데이트 {formatClockTime(channel.lastSyncedAt)}
              <br />
              다음 댓글 업데이트 <SyncCountdown target={nextSyncAt} />
            </p>
          )}

          <LogoutButton className="border-sidebar-border bg-transparent text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground" />
        </div>
      </aside>
    </>
  );
}
