"use client";

import { NotificationTypeIcon } from "@/components/notifications/notification-type-icon";
import {
  NotificationRow,
  type Notification,
} from "@/components/notifications/notification-row";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function formatDayLabel(date: Date): string {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${WEEKDAYS[date.getDay()]})`;
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function NotificationTimeline({
  notifications,
  channelId,
}: {
  notifications: Notification[];
  channelId: string;
}) {
  const groups: { key: string; label: string; items: Notification[] }[] = [];
  for (const notification of notifications) {
    const key = dayKey(notification.createdAt);
    const lastGroup = groups.at(-1);
    if (lastGroup?.key === key) {
      lastGroup.items.push(notification);
    } else {
      groups.push({
        key,
        label: formatDayLabel(notification.createdAt),
        items: [notification],
      });
    }
  }

  return (
    <div className="flex flex-col">
      {groups.map((group) => (
        <div key={group.key} className="mb-7 last:mb-0">
          <div className="mb-3 flex items-center gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center">
              <span
                className="size-2.5 rounded-full bg-muted-foreground"
                aria-hidden
              />
            </span>
            <span className="text-xs font-bold text-muted-foreground">
              {group.label}
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {group.items.map((notification) => (
              <div key={notification.id} className="flex gap-3">
                <div className="flex w-6 shrink-0 justify-center pt-3">
                  <NotificationTypeIcon
                    type={notification.type}
                    className="size-6 border-2 border-background"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <NotificationRow
                    notification={notification}
                    channelId={channelId}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
