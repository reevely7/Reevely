"use client";

import Link from "next/link";

import { RiskBadge } from "@/components/dashboard/risk-badge";

export type Notification = {
  id: string;
  type:
    | "new_comment"
    | "repeat_author"
    | "review_backlog"
    | "video_spike"
    | "weekly_digest"
    | "payment_failed"
    | "payment_downgraded"
    | "analysis_quota_reached"
    | "reauth_required";
  isRead: boolean;
  createdAt: Date;
  title: string | null;
  message: string | null;
  href: string | null;
  commentText: string | null;
  reason: string | null;
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
  channelId,
}: {
  notification: Notification;
  channelId: string;
}) {
  function handleClick() {
    if (!notification.isRead) {
      fetch(`/api/notifications/${notification.id}/read`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId }),
      });
    }
  }

  const wrapperClassName = `flex flex-col gap-1 rounded-2xl px-4 py-3.5 transition-colors hover:bg-accent/50 ${
    notification.isRead ? "bg-card" : "bg-primary/10"
  }`;

  if (notification.type !== "new_comment") {
    return (
      <Link
        href={notification.href ?? `/c/${channelId}/notifications`}
        onClick={handleClick}
        className={wrapperClassName}
      >
        <div className="flex items-center gap-2">
          {!notification.isRead && (
            <span
              className="size-1.5 shrink-0 rounded-full bg-primary"
              aria-hidden
            />
          )}
          <span className="text-[13px] font-bold text-foreground">
            {notification.title}
          </span>
          <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
            {formatDateTime(notification.createdAt)}
          </span>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {notification.message}
        </p>
      </Link>
    );
  }

  return (
    <Link
      href={notification.href ?? `/c/${channelId}/dashboard`}
      onClick={handleClick}
      className={wrapperClassName}
    >
      <div className="flex items-center gap-2">
        {!notification.isRead && (
          <span
            className="size-1.5 shrink-0 rounded-full bg-primary"
            aria-hidden
          />
        )}
        <span className="text-[13px] font-bold text-foreground">
          {notification.authorDisplayName ?? "알 수 없음"} 님이 새 댓글을 남겼습니다
        </span>
        {notification.riskLevel && <RiskBadge riskLevel={notification.riskLevel} />}
        <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
          {formatDateTime(notification.createdAt)}
        </span>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        {notification.reason ?? notification.commentText}
        {notification.category && (
          <>
            {" · "}
            <b className="font-semibold text-card-foreground">
              {notification.category}
            </b>
          </>
        )}
        {notification.videoTitle && ` · ${notification.videoTitle}`}
      </p>
    </Link>
  );
}
