"use client";

import Link from "next/link";

import { RiskBadge } from "@/components/dashboard/risk-badge";

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
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function NotificationRow({
  notification,
}: {
  notification: Notification;
}) {
  function handleClick() {
    if (!notification.isRead) {
      fetch(`/api/notifications/${notification.id}/read`, {
        method: "PATCH",
      });
    }
  }

  const wrapperClassName = `flex flex-col gap-2 rounded-2xl px-5 py-4 transition-colors hover:bg-accent/50 ${
    notification.isRead ? "bg-card" : "bg-card ring-1 ring-primary/40"
  }`;

  if (notification.type !== "new_comment") {
    return (
      <Link
        href={notification.href ?? "/notifications"}
        onClick={handleClick}
        className={wrapperClassName}
      >
        <div className="flex items-center gap-2">
          {!notification.isRead && (
            <span
              className="size-2 shrink-0 rounded-full bg-primary"
              aria-hidden
            />
          )}
          <span className="text-sm font-medium text-foreground">
            {notification.title}
          </span>
          <span className="ml-auto shrink-0 font-mono text-xs text-muted-foreground">
            {formatDateTime(notification.createdAt)}
          </span>
        </div>
        <p className="text-sm text-card-foreground">{notification.message}</p>
      </Link>
    );
  }

  return (
    <Link
      href={notification.href ?? "/dashboard"}
      onClick={handleClick}
      className={wrapperClassName}
    >
      <div className="flex items-center gap-2">
        {!notification.isRead && (
          <span
            className="size-2 shrink-0 rounded-full bg-primary"
            aria-hidden
          />
        )}
        <span className="text-sm font-medium text-foreground">
          {notification.authorDisplayName ?? "알 수 없음"}
        </span>
        <span className="text-xs text-muted-foreground">
          님이 새 댓글을 남겼습니다
        </span>
        <span className="ml-auto shrink-0 font-mono text-xs text-muted-foreground">
          {formatDateTime(notification.createdAt)}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {notification.riskLevel && (
          <RiskBadge riskLevel={notification.riskLevel} />
        )}
        <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
          {notification.category ?? "미분류"}
        </span>
      </div>

      <p className="line-clamp-2 text-sm text-card-foreground">
        {notification.commentText}
      </p>

      <p className="truncate text-xs text-muted-foreground">
        {notification.videoTitle ?? notification.videoId}
      </p>
    </Link>
  );
}
