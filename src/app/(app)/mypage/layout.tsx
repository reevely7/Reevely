import { AppSidebar } from "@/components/layout/app-sidebar";
import { requireChannels } from "@/lib/auth/require-channels";
import { getNextSyncAt } from "@/lib/db/queries/channels";
import { countReviewQueue } from "@/lib/db/queries/comments";
import { countUnreadNotifications } from "@/lib/db/queries/notifications";
import { getChannelLimitForUser } from "@/lib/db/queries/subscriptions";

export default async function MypageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, channels, nickname } = await requireChannels();
  const defaultChannel = channels[0];

  const [reviewCount, unreadNotificationCount, channelLimit] = await Promise.all([
    countReviewQueue(defaultChannel.id),
    countUnreadNotifications(defaultChannel.id),
    getChannelLimitForUser(user.id),
  ]);

  const channelsWithSync = channels.map((c) => ({
    ...c,
    nextSyncAt: getNextSyncAt(c),
  }));

  const atChannelLimit =
    channels.filter((c) => c.status === "active").length >= channelLimit;

  return (
    <div className="flex h-dvh flex-col overflow-hidden md:flex-row">
      <AppSidebar
        channels={channelsWithSync}
        nickname={nickname}
        reviewCount={reviewCount}
        unreadNotificationCount={unreadNotificationCount}
        atChannelLimit={atChannelLimit}
      />
      <div className="flex flex-1 flex-col overflow-y-auto bg-background">
        {children}
      </div>
    </div>
  );
}
