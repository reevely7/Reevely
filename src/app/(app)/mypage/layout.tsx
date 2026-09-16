import { NotificationBell } from "@/components/dashboard/notification-bell";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { TopBarAccountMenu } from "@/components/layout/top-bar-account-menu";
import { requireChannels } from "@/lib/auth/require-channels";
import { getNextSyncAt } from "@/lib/db/queries/channels";
import { countReviewQueue } from "@/lib/db/queries/comments";
import {
  countUnreadNotifications,
  getNotifications,
} from "@/lib/db/queries/notifications";
import {
  getChannelLimitForUser,
  getSubscriptionByUserId,
  getSyncIntervalForUser,
  PLAN_LABELS,
} from "@/lib/db/queries/subscriptions";

const RECENT_NOTIFICATIONS_LIMIT = 8;

export default async function MypageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, channels, nickname } = await requireChannels();
  const defaultChannel = channels[0];

  const [
    reviewCount,
    unreadNotificationCount,
    recentNotifications,
    channelLimit,
    syncIntervalMs,
    subscription,
  ] = await Promise.all([
    countReviewQueue(defaultChannel.id),
    countUnreadNotifications(defaultChannel.id),
    getNotifications(defaultChannel.id, { limit: RECENT_NOTIFICATIONS_LIMIT }),
    getChannelLimitForUser(user.id),
    getSyncIntervalForUser(user.id),
    getSubscriptionByUserId(user.id),
  ]);

  const channelsWithSync = channels.map((c) => ({
    ...c,
    nextSyncAt: getNextSyncAt(c, syncIntervalMs),
  }));

  const atChannelLimit =
    channels.filter((c) => c.status === "active").length >= channelLimit;

  const planLabel = subscription ? PLAN_LABELS[subscription.plan] : "무료";

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="hidden shrink-0 items-center justify-end gap-4 border-b border-[#CAD6CF] bg-[#EEEFF1] px-6 py-2 md:flex">
        <TopBarAccountMenu
          nickname={nickname}
          email={user.email ?? null}
          channelId={defaultChannel.id}
        />
        <NotificationBell
          notifications={recentNotifications}
          unreadCount={unreadNotificationCount}
          channelId={defaultChannel.id}
        />
      </header>
      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        <AppSidebar
          channels={channelsWithSync}
          planLabel={planLabel}
          reviewCount={reviewCount}
          unreadNotificationCount={unreadNotificationCount}
          atChannelLimit={atChannelLimit}
        />
        <div className="flex flex-1 flex-col overflow-y-auto bg-background">
          <header className="flex shrink-0 items-center justify-end gap-4 border-b border-[#CAD6CF] bg-[#EEEFF1] px-6 py-2 sm:px-10 md:hidden">
            <TopBarAccountMenu
              nickname={nickname}
              email={user.email ?? null}
              channelId={defaultChannel.id}
            />
            <NotificationBell
              notifications={recentNotifications}
              unreadCount={unreadNotificationCount}
              channelId={defaultChannel.id}
            />
          </header>
          {children}
        </div>
      </div>
    </div>
  );
}
