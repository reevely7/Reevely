import Image from "next/image";
import Link from "next/link";

import { LogoutButton } from "@/components/auth/logout-button";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";
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
    <aside className="flex w-60 shrink-0 flex-col justify-between bg-[#213448] px-4 py-5 text-[#ECEFCA]">
      <div className="flex flex-col gap-6">
        <Link
          href="/dashboard"
          className="font-heading text-xl italic tracking-tight"
        >
          Reevely
        </Link>

        <SidebarNav reviewCount={reviewCount} />
      </div>

      <div className="flex flex-col gap-3 border-t border-[#547792]/30 pt-4">
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
          <p className="truncate text-xs text-[#94B4C1]">
            {channel.channelTitle}
          </p>
        </div>

        {channel.lastSyncedAt && (
          <p className="font-mono text-[11px] leading-relaxed text-[#547792]">
            마지막 확인 {formatRelativeTime(channel.lastSyncedAt)}
            <br />
            다음 확인 {formatRelativeTime(nextSyncAt)}
          </p>
        )}

        <div className="flex items-center justify-between">
          <ThemeToggle />
          <LogoutButton className="border-[#547792]/40 bg-transparent text-[#94B4C1] hover:bg-[#547792]/15 hover:text-[#ECEFCA]" />
        </div>
      </div>
    </aside>
  );
}
