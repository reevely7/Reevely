"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Lock,
  Menu,
  Plus,
  Settings,
  X,
} from "lucide-react";
import { useState } from "react";

import { SidebarNav } from "@/components/layout/sidebar-nav";
import { SyncCountdown } from "@/components/layout/sync-countdown";
import { wordmarkFont } from "@/lib/fonts";
import { formatClockTime } from "@/lib/format/clock-time";
import { formatSubscriberCount } from "@/lib/format/subscriber-count";

type SidebarChannel = {
  id: string;
  channelTitle: string;
  thumbnailUrl: string | null;
  subscriberCount: number | null;
  status: "active" | "locked";
  reauthRequiredAt: Date | null;
  lastSyncedAt: Date | null;
  nextSyncAt: Date;
};

export function AppSidebar({
  channels,
  activeChannelId,
  planLabel,
  reviewCount,
  unreadNotificationCount,
  atChannelLimit,
}: {
  channels: SidebarChannel[];
  activeChannelId?: string;
  planLabel: string;
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
          className="flex items-center gap-0.5 text-lg font-extrabold tracking-tight text-sidebar-foreground"
        >
          <Image src="/logo-mark.png" alt="" width={44} height={44} />
          <span className={`${wordmarkFont.className} relative top-1`}>Reevely</span>
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
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 -translate-x-full flex-col justify-between border-r border-[#CAD6CF] bg-sidebar px-4 py-5 text-sidebar-foreground transition-transform duration-200 md:static md:z-auto md:w-64 md:translate-x-0 ${
          isOpen ? "translate-x-0" : ""
        }`}
      >
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <Link
              href={homeHref}
              className="flex items-center gap-0.5 text-xl font-extrabold tracking-tight"
            >
              <Image src="/logo-mark.png" alt="" width={52} height={52} />
              <span className={`${wordmarkFont.className} relative top-1`}>Reevely</span>
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
            <div className="relative -mt-2">
              <button
                type="button"
                onClick={() => setIsSwitcherOpen((v) => !v)}
                aria-expanded={isSwitcherOpen}
                className="flex w-full items-center justify-between gap-2 rounded-lg border border-sidebar-border px-2.5 py-3.5 text-left hover:bg-sidebar-accent"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  {activeChannel.thumbnailUrl ? (
                    <Image
                      src={activeChannel.thumbnailUrl}
                      alt={activeChannel.channelTitle}
                      width={36}
                      height={36}
                      className="shrink-0 rounded-full"
                    />
                  ) : (
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
                      {activeChannel.channelTitle.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">
                      {activeChannel.channelTitle}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/youtube-icon.png" alt="" className="h-3 w-4" />
                      YouTube
                      {activeChannel.subscriberCount != null &&
                        ` · 구독자 ${formatSubscriberCount(activeChannel.subscriberCount)}`}
                    </span>
                  </span>
                </span>
                <ChevronDown
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
              </button>

              {isSwitcherOpen && (
                <div className="absolute top-full left-0 z-10 mt-1 w-full min-w-[260px] rounded-lg border border-sidebar-border bg-sidebar py-1.5 shadow-lg">
                  <p className="px-3 py-2 text-xs font-medium text-muted-foreground">
                    연동된 채널
                  </p>
                  {channels.map((c) => (
                    <Link
                      key={c.id}
                      href={
                        c.status === "locked"
                          ? "/mypage/subscription"
                          : `/c/${c.id}/dashboard`
                      }
                      onClick={() => setIsSwitcherOpen(false)}
                      className={`mx-2 mb-1 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm last:mb-0 ${
                        c.id === activeChannel.id
                          ? "bg-sidebar-accent"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                      }`}
                    >
                      {c.thumbnailUrl ? (
                        <Image
                          src={c.thumbnailUrl}
                          alt={c.channelTitle}
                          width={28}
                          height={28}
                          className="shrink-0 rounded-full"
                        />
                      ) : (
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
                          {c.channelTitle.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">
                          {c.channelTitle}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src="/youtube-icon.png" alt="" className="h-3 w-4" />
                          YouTube
                          {c.subscriberCount != null &&
                            ` · 구독자 ${formatSubscriberCount(c.subscriberCount)}`}
                        </span>
                      </span>
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
                      {c.id === activeChannel.id && (
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check className="size-3" aria-hidden />
                        </span>
                      )}
                    </Link>
                  ))}
                  <div className="mx-3 mt-3 border-t border-sidebar-border/50" />
                  <div className="pt-1">
                    <Link
                      href={
                        atChannelLimit
                          ? "/mypage/account?error=channel_limit"
                          : "/channel-connect/start"
                      }
                      onClick={() => setIsSwitcherOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-sidebar-accent"
                    >
                      <Plus className="size-3.5 shrink-0" aria-hidden />
                      새 채널 연동하기
                    </Link>
                    <Link
                      href="/mypage/account"
                      onClick={() => setIsSwitcherOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent"
                    >
                      <Settings
                        className="size-3.5 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                      채널 관리
                    </Link>
                  </div>
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
          <p className="truncate text-xs text-muted-foreground">
            {planLabel} 플랜
          </p>

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
        </div>
      </aside>
    </>
  );
}
