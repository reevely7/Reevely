import { AppSidebar } from "@/components/layout/app-sidebar";
import { requireChannels } from "@/lib/auth/require-channels";
import { getNextSyncAt } from "@/lib/db/queries/channels";
import { countReviewQueue } from "@/lib/db/queries/comments";
import { countUnreadNotifications } from "@/lib/db/queries/notifications";
import {
  getChannelLimitForUser,
  getSubscriptionByUserId,
  getSyncIntervalForUser,
  PLAN_LABELS,
} from "@/lib/db/queries/subscriptions";

export default async function MypageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, channels } = await requireChannels();
  const defaultChannel = channels[0];

  const [
    reviewCount,
    unreadNotificationCount,
    channelLimit,
    syncIntervalMs,
    subscription,
  ] = await Promise.all([
    countReviewQueue(defaultChannel.id),
    countUnreadNotifications(defaultChannel.id),
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
  const isPro = subscription?.plan === "pro";

  return (
    <div className="flex h-dvh flex-col overflow-hidden md:flex-row">
      <AppSidebar
        channels={channelsWithSync}
        planLabel={planLabel}
        isPro={isPro}
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
