import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { getChannelByUserId, getNextSyncAt } from "@/lib/db/queries/channels";
import { countReviewQueue } from "@/lib/db/queries/comments";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const channel = await getChannelByUserId(user.id);
  if (!channel) {
    redirect("/onboarding");
  }

  const reviewCount = await countReviewQueue(user.id);
  const nextSyncAt = getNextSyncAt(channel);

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <AppSidebar
        channel={channel}
        reviewCount={reviewCount}
        nextSyncAt={nextSyncAt}
      />
      <div className="flex flex-1 flex-col overflow-y-auto bg-background">
        {children}
      </div>
    </div>
  );
}
