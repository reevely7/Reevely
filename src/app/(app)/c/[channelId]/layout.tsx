import { notFound } from "next/navigation";

import { NotificationBell } from "@/components/dashboard/notification-bell";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { requireChannels } from "@/lib/auth/require-channels";
import { getNextSyncAt } from "@/lib/db/queries/channels";
import { countReviewQueue } from "@/lib/db/queries/comments";
import {
  countUnreadNotifications,
  getNotifications,
} from "@/lib/db/queries/notifications";

const RECENT_NOTIFICATIONS_LIMIT = 8;

export default async function ChannelLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ channelId: string }>;
}) {
  const { channelId } = await params;
  const { channels, nickname } = await requireChannels();

  const channel = channels.find((c) => c.id === channelId);
  if (!channel) {
    notFound();
  }

  const [reviewCount, unreadNotificationCount, recentNotifications] =
    await Promise.all([
      countReviewQueue(channelId),
      countUnreadNotifications(channelId),
      getNotifications(channelId, RECENT_NOTIFICATIONS_LIMIT),
    ]);

  const channelsWithSync = channels.map((c) => ({
    ...c,
    nextSyncAt: getNextSyncAt(c),
  }));

  return (
    <div className="flex h-dvh flex-col overflow-hidden md:flex-row">
      <AppSidebar
        channels={channelsWithSync}
        activeChannelId={channelId}
        nickname={nickname}
        reviewCount={reviewCount}
        unreadNotificationCount={unreadNotificationCount}
      />
      <div className="flex flex-1 flex-col overflow-y-auto bg-background">
        <header className="flex shrink-0 items-center justify-end border-b border-border px-6 py-2 sm:px-10">
          <NotificationBell
            notifications={recentNotifications}
            unreadCount={unreadNotificationCount}
            channelId={channelId}
          />
        </header>
        {children}
      </div>
    </div>
  );
}
