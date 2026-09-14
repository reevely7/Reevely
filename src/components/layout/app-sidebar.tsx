"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertTriangle, ChevronDown, Lock, Menu, Plus, X } from "lucide-react";
import { useState } from "react";

import { LogoutButton } from "@/components/auth/logout-button";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { SyncCountdown } from "@/components/layout/sync-countdown";
import { formatClockTime } from "@/lib/format/clock-time";

type SidebarChannel = {
  id: string;
  channelTitle: string;
  thumbnailUrl: string | null;
  status: "active" | "locked";
  reauthRequiredAt: Date | null;
  lastSyncedAt: Date | null;
  nextSyncAt: Date;
};

export function AppSidebar({
  channels,
  activeChannelId,
  planLabel,
  isPro,
  reviewCount,
  unreadNotificationCount,
  atChannelLimit,
}: {
  channels: SidebarChannel[];
  activeChannelId?: string;
  planLabel: string;
  isPro: boolean;
  reviewCount: number;
  unreadNotificationCount: number;
  atChannelLimit: boolean;
}) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

  // 페이지 이동하면 모바일 드로어/채널 전환 드롭다운은 자동으로 닫는다 (레이아웃이
  // 라우트 전환 사이에 유지되는 공유 레이아웃이라 상태가 저절로 리셋되지 않음).
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setIsOpen(false);
    setIsSwitcherOpen(false);
  }

  const activeChannel =
    channels.find((c) => c.id === activeChannelId) ?? channels[0];
  const homeHref = activeChannel ? `/c/${activeChannel.id}/dashboard` : "/mypage";

  return (
    <>
      <header className="flex items-center justify-between border-b border-sidebar-border bg-sidebar px-4 py-3 md:hidden">
        <Link
          href={homeHref}
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
              href={homeHref}
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

          {activeChannel && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsSwitcherOpen((v) => !v)}
                aria-expanded={isSwitcherOpen}
                className="flex w-full items-center justify-between gap-2 rounded-lg border border-sidebar-border px-2.5 py-2 text-left hover:bg-sidebar-accent"
              >
                <span className="flex min-w-0 items-center gap-2">
                  {activeChannel.thumbnailUrl && (
                    <Image
                      src={activeChannel.thumbnailUrl}
                      alt={activeChannel.channelTitle}
                      width={22}
                      height={22}
                      className="rounded-full"
                    />
                  )}
                  <span className="truncate text-sm">
                    {activeChannel.channelTitle}
                  </span>
                </span>
                <ChevronDown
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
              </button>

              {isSwitcherOpen && (
                <div className="absolute top-full left-0 z-10 mt-1 w-full rounded-lg border border-sidebar-border bg-sidebar py-1 shadow-lg">
                  {channels.map((c) => (
                    <Link
                      key={c.id}
                      href={
                        c.status === "locked"
                          ? "/mypage/subscription"
                          : `/c/${c.id}/dashboard`
                      }
                      onClick={() => setIsSwitcherOpen(false)}
                      className={`flex items-center gap-2 px-3 py-2 text-sm hover:bg-sidebar-accent ${
                        c.id === activeChannel.id
                          ? "text-primary"
                          : "text-sidebar-foreground"
                      }`}
                    >
                      {c.status === "locked" && (
                        <Lock
                          className="size-3.5 shrink-0 text-muted-foreground"
                          aria-hidden
                        />
                      )}
                      {c.reauthRequiredAt && (
                        <AlertTriangle
                          className="size-3.5 shrink-0 text-risk-high"
                          aria-hidden
                        />
                      )}
                      <span className="truncate">{c.channelTitle}</span>
                    </Link>
                  ))}
                  <Link
                    href={
                      atChannelLimit
                        ? "/mypage/account?error=channel_limit"
                        : "/channel-connect/start"
                    }
                    onClick={() => setIsSwitcherOpen(false)}
                    className="flex items-center gap-2 border-t border-sidebar-border px-3 py-2 text-sm text-primary hover:bg-sidebar-accent"
                  >
                    <Plus className="size-3.5 shrink-0" aria-hidden />
                    채널 추가
                  </Link>
                </div>
              )}
            </div>
          )}

          <SidebarNav
            channelId={activeChannel?.id}
            reviewCount={reviewCount}
            unreadNotificationCount={unreadNotificationCount}
          />
        </div>

        <div className="flex flex-col gap-3 border-t border-sidebar-border pt-4">
          <Link
            href="/mypage/subscription/plans"
            className="flex items-center justify-between rounded-lg px-1 py-1 hover:bg-sidebar-accent"
          >
            <span className="truncate text-xs text-muted-foreground">
              {planLabel} 플랜
            </span>
            {!isPro && (
              <span className="shrink-0 text-xs font-medium text-primary">
                업그레이드
              </span>
            )}
          </Link>

          {activeChannel?.reauthRequiredAt ? (
            <p className="text-[11px] leading-relaxed text-risk-high">
              유튜브 연동이 끊어져 새 댓글을 가져오지 못하고 있어요.
              <br />
              <Link href="/channel-connect/start" className="font-medium underline">
                다시 연동하기
              </Link>
            </p>
          ) : (
            activeChannel?.lastSyncedAt && (
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                최근 댓글 업데이트 {formatClockTime(activeChannel.lastSyncedAt)}
                <br />
                다음 댓글 업데이트{" "}
                <SyncCountdown target={activeChannel.nextSyncAt} />
              </p>
            )
          )}

          <LogoutButton className="border-sidebar-border bg-transparent text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground" />
        </div>
      </aside>
    </>
  );
}
