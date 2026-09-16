import { NOTIFICATION_TYPE_META, NotificationTypeIcon } from "@/components/notifications/notification-type-icon";
import type { NotificationType } from "@/lib/db/queries/notifications";

const SUMMARY_ORDER: NotificationType[] = [
  "video_spike",
  "new_comment",
  "repeat_author",
  "review_backlog",
  "weekly_digest",
];

export function NotificationSummarySidebar({
  countsByType,
}: {
  countsByType: Partial<Record<NotificationType, number>>;
}) {
  return (
    <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
      <div className="rounded-2xl bg-card px-5 py-5">
        <h2 className="mb-4 text-xs font-bold tracking-wide text-muted-foreground">
          유형별 개수
        </h2>
        <div className="flex flex-col gap-3">
          {SUMMARY_ORDER.map((type) => (
            <div key={type} className="flex items-center gap-2.5 text-xs font-semibold">
              <NotificationTypeIcon type={type} />
              <span className="text-muted-foreground">
                {NOTIFICATION_TYPE_META[type]?.label}
              </span>
              <span className="ml-auto tabular-nums text-card-foreground">
                {countsByType[type] ?? 0}
              </span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
