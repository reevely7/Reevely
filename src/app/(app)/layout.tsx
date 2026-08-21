import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { getChannelByUserId, getNextSyncAt } from "@/lib/db/queries/channels";
import { countReviewQueue } from "@/lib/db/queries/comments";
import { countUnreadNotifications } from "@/lib/db/queries/notifications";
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

  const [reviewCount, unreadNotificationCount] = await Promise.all([
    countReviewQueue(user.id),
    countUnreadNotifications(user.id),
  ]);
  const nextSyncAt = getNextSyncAt(channel);
  const nickname = (user.user_metadata?.nickname as string | undefined) || null;

  return (
    // body가 min-h-full(최소 높이)만 갖고 있어 콘텐츠가 길어지면 body 자체가
    // 늘어나면서 사이드바까지 페이지와 함께 스크롤되던 문제 — 여기서 뷰포트
    // 높이를 못박고 넘치는 부분은 안쪽 콘텐츠 div만 스크롤하게 가둔다.
    // flex-1(flex-basis: 0%)을 h-dvh와 같이 주면 flex 알고리즘이 높이를
    // 무시해버려서 반드시 빼야 한다 (실제 재현 테스트로 확인함).
    <div className="flex h-dvh flex-col overflow-hidden md:flex-row">
      <AppSidebar
        channel={channel}
        nickname={nickname}
        reviewCount={reviewCount}
        unreadNotificationCount={unreadNotificationCount}
        nextSyncAt={nextSyncAt}
      />
      <div className="flex flex-1 flex-col overflow-y-auto bg-background">
        {children}
      </div>
    </div>
  );
}
