import Image from "next/image";
import Link from "next/link";

import { LogoutButton } from "@/components/auth/logout-button";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { getNextSyncAt } from "@/lib/db/queries/channels";
import { formatRelativeTime } from "@/lib/format/relative-time";

type Channel = {
  channelTitle: string;
  thumbnailUrl: string | null;
  lastSyncedAt: Date | null;
  latestVideoPublishedAt: Date | null;
};

export function AppSidebar({
  channel,
  reviewCount,
}: {
  channel: Channel;
  reviewCount: number;
}) {
  const nextSyncAt = getNextSyncAt(channel);

  return (
    <aside className="flex w-60 shrink-0 flex-col justify-between bg-sidebar px-4 py-5 text-sidebar-foreground">
      <div className="flex flex-col gap-6">
        <Link
          href="/dashboard"
          className="text-xl font-semibold tracking-tight"
        >
          Reevely
        </Link>

        <SidebarNav reviewCount={reviewCount} />
      </div>

      <div className="flex flex-col gap-3 border-t border-sidebar-border pt-4">
        <div className="flex items-center gap-2">
          {channel.thumbnailUrl && (
            <Image
              src={channel.thumbnailUrl}
              alt={channel.channelTitle}
              width={28}
              height={28}
              className="rounded-full"
            />
          )}
          <p className="truncate text-xs text-muted-foreground">
            {channel.channelTitle}
          </p>
        </div>

        {channel.lastSyncedAt && (
          <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
            마지막 확인 {formatRelativeTime(channel.lastSyncedAt)}
            <br />
            다음 확인 {formatRelativeTime(nextSyncAt)}
          </p>
        )}

        <LogoutButton className="border-sidebar-border bg-transparent text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground" />
      </div>
    </aside>
  );
}
