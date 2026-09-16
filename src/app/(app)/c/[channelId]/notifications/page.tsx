import { BellIcon } from "@/components/icons/bell-icon";
import { MarkAllReadButton } from "@/components/notifications/mark-all-read-button";
import { NotificationSummarySidebar } from "@/components/notifications/notification-summary-sidebar";
import { NotificationTabs } from "@/components/notifications/notification-tabs";
import { NotificationTimeline } from "@/components/notifications/notification-timeline";
import { requireChannelOwnership } from "@/lib/auth/require-channel-ownership";
import {
  countNotificationsByType,
  getNotifications,
} from "@/lib/db/queries/notifications";
import { NOTIFICATION_TABS } from "@/lib/notifications/tabs";

export default async function NotificationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ channelId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { channelId } = await params;
  await requireChannelOwnership(channelId);

  const sp = await searchParams;
  const activeTab =
    NOTIFICATION_TABS.find((tab) => tab.key === sp.tab) ?? NOTIFICATION_TABS[0];

  const [notifications, countsByType] = await Promise.all([
    getNotifications(channelId, { types: activeTab.types ?? undefined }),
    countNotificationsByType(channelId),
  ]);
  const hasUnread = notifications.some((n) => !n.isRead);

  const tabCounts = Object.fromEntries(
    NOTIFICATION_TABS.map((tab) => [
      tab.key,
      tab.types
        ? tab.types.reduce((sum, type) => sum + (countsByType[type] ?? 0), 0)
        : Object.values(countsByType).reduce((sum, c) => sum + c, 0),
    ]),
  );

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8 sm:px-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xl font-semibold tracking-tight text-foreground">
            알림
          </p>
          <p className="text-xs text-muted-foreground">
            위험 댓글 증가, 반복 작성자, 검토 필요 등 중요한 변화만 알려드립니다.
          </p>
        </div>
        {hasUnread && <MarkAllReadButton channelId={channelId} />}
      </header>

      <NotificationTabs counts={tabCounts} />

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-card px-6 py-16 text-center">
          <BellIcon className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {activeTab.key === "all"
              ? "아직 알림이 없습니다. 작성자 상세 페이지에서 \"새 댓글 알림 받기\"를 눌러보세요."
              : "이 탭에는 아직 알림이 없어요."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
          <NotificationTimeline notifications={notifications} channelId={channelId} />
          <NotificationSummarySidebar countsByType={countsByType} />
        </div>
      )}
    </main>
  );
}
