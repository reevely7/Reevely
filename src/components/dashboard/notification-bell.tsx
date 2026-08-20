"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { RiskBadge } from "@/components/dashboard/risk-badge";
import { BellIcon } from "@/components/icons/bell-icon";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type Notification = {
  id: string;
  type:
    | "new_comment"
    | "repeat_author"
    | "review_backlog"
    | "video_spike"
    | "weekly_digest";
  isRead: boolean;
  createdAt: Date;
  title: string | null;
  message: string | null;
  href: string | null;
  commentText: string | null;
  riskLevel: "high" | "medium" | "low" | null;
  category: string | null;
  authorDisplayName: string | null;
  videoId: string | null;
  videoTitle: string | null;
};

function formatDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function NotificationBell({
  notifications,
  unreadCount,
}: {
  notifications: Notification[];
  unreadCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  function handleNotificationClick(notification: Notification) {
    if (!notification.isRead) {
      fetch(`/api/notifications/${notification.id}/read`, {
        method: "PATCH",
      });
    }
    setOpen(false);
  }

  async function handleMarkAllRead() {
    setIsMarkingAll(true);
    const res = await fetch("/api/notifications/read-all", {
      method: "PATCH",
    });
    if (res.ok) {
      router.refresh();
    }
    setIsMarkingAll(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={
          unreadCount > 0 ? `알림, 안읽음 ${unreadCount}개` : "알림"
        }
        className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-md text-foreground transition-colors hover:bg-accent"
      >
        <BellIcon className="size-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-risk-high px-1 font-mono text-[10px] font-semibold text-risk-high-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent align="end" className="w-96 gap-0 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-semibold text-foreground">알림</span>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={isMarkingAll}
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground disabled:opacity-50"
            >
              {isMarkingAll ? "처리 중…" : "모두 읽음으로 표시"}
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            알림이 없습니다.
          </p>
        ) : (
          <div className="flex max-h-96 flex-col overflow-y-auto">
            {notifications.map((notification) => {
              const itemClassName = `flex flex-col gap-1.5 border-b border-border px-4 py-3 transition-colors last:border-0 hover:bg-accent/50 ${
                notification.isRead ? "" : "bg-primary/5"
              }`;

              if (notification.type !== "new_comment") {
                return (
                  <Link
                    key={notification.id}
                    href={notification.href ?? "/notifications"}
                    onClick={() => handleNotificationClick(notification)}
                    className={itemClassName}
                  >
                    <div className="flex items-center gap-2">
                      {!notification.isRead && (
                        <span
                          className="size-1.5 shrink-0 rounded-full bg-primary"
                          aria-hidden
                        />
                      )}
                      <span className="truncate text-sm font-medium text-foreground">
                        {notification.title}
                      </span>
                      <span className="ml-auto shrink-0 font-mono text-[11px] text-muted-foreground">
                        {formatDateTime(notification.createdAt)}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {notification.message}
                    </p>
                  </Link>
                );
              }

              return (
                <Link
                  key={notification.id}
                  href={notification.href ?? "/dashboard"}
                  onClick={() => handleNotificationClick(notification)}
                  className={itemClassName}
                >
                  <div className="flex items-center gap-2">
                    {!notification.isRead && (
                      <span
                        className="size-1.5 shrink-0 rounded-full bg-primary"
                        aria-hidden
                      />
                    )}
                    <span className="truncate text-sm font-medium text-foreground">
                      {notification.authorDisplayName ?? "알 수 없음"}
                    </span>
                    <span className="ml-auto shrink-0 font-mono text-[11px] text-muted-foreground">
                      {formatDateTime(notification.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {notification.riskLevel && (
                      <RiskBadge riskLevel={notification.riskLevel} />
                    )}
                    <span className="line-clamp-1 text-xs text-muted-foreground">
                      {notification.commentText}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <div className="border-t border-border px-4 py-2.5">
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block text-center text-xs text-primary hover:underline"
          >
            전체 알림 보기
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
