import { BarChart3, Clock, Flame, MessageCircle, Repeat } from "lucide-react";

import type { NotificationType } from "@/lib/db/queries/notifications";

export const NOTIFICATION_TYPE_META: Partial<
  Record<NotificationType, { label: string; icon: typeof MessageCircle; iconClass: string }>
> = {
  video_spike: {
    label: "위험 급증",
    icon: Flame,
    iconClass: "bg-risk-high-bg text-risk-high",
  },
  new_comment: {
    label: "새 댓글",
    icon: MessageCircle,
    iconClass: "bg-risk-low-bg text-risk-low",
  },
  repeat_author: {
    label: "반복 작성자",
    icon: Repeat,
    iconClass: "bg-status-needs-review-bg text-status-needs-review",
  },
  review_backlog: {
    label: "검토 필요",
    icon: Clock,
    iconClass: "bg-status-needs-review-bg text-status-needs-review",
  },
  weekly_digest: {
    label: "주간 요약",
    icon: BarChart3,
    iconClass: "bg-accent text-primary",
  },
};

export function NotificationTypeIcon({
  type,
  className,
}: {
  type: NotificationType;
  className?: string;
}) {
  const meta = NOTIFICATION_TYPE_META[type];
  const Icon = meta?.icon ?? MessageCircle;
  const iconClass = meta?.iconClass ?? "bg-muted text-muted-foreground";

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full ${iconClass} ${className ?? "size-7"}`}
      aria-hidden
    >
      <Icon className="size-3.5" />
    </span>
  );
}
