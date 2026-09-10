import { redirect } from "next/navigation";

import { MypageNav } from "@/components/mypage/mypage-nav";
import { Button } from "@/components/ui/button";
import { DangerZoneButton } from "@/components/settings/danger-zone-button";
import {
  deleteChannelByUserId,
  getChannelsByUserId,
} from "@/lib/db/queries/channels";
import { deleteCommentsByUserId } from "@/lib/db/queries/comments";
import { deleteNotificationsByUserId } from "@/lib/db/queries/notifications";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function MypageAccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  // TODO(Task 9): 여러 채널 각각 개별 연동 해제가 되도록 다시 설계 필요 — 지금은
  // 첫 채널만 보여주고, 해제 시 이 유저의 모든 채널을 한꺼번에 지운다 (임시 조치,
  // tsc를 깨끗하게 유지하기 위한 최소 수정일 뿐 Task 9의 본래 재설계는 아님).
  const channels = await getChannelsByUserId(user.id);
  const channel = channels[0] ?? null;
  const userId = user.id;

  async function disconnectChannel() {
    "use server";
    await deleteChannelByUserId(userId);
    redirect("/onboarding");
  }

  async function deleteAccount() {
    "use server";
    await deleteNotificationsByUserId(userId);
    await deleteCommentsByUserId(userId);
    await deleteChannelByUserId(userId);

    const admin = createAdminClient();
    await admin.auth.admin.deleteUser(userId);

    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/");
  }

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8 sm:px-10">
      <header>
        <p className="text-xl font-semibold tracking-tight text-foreground">
          마이페이지
        </p>
        <p className="text-xs text-muted-foreground">
          계정과 연동된 채널 정보를 관리합니다.
        </p>
      </header>

      <MypageNav />

      <section className="space-y-3 rounded-2xl bg-card px-5 py-4">
        <h2 className="text-sm font-medium text-card-foreground">
          연동된 채널
        </h2>
        {channel && (
          <>
            <p className="text-sm text-muted-foreground">
              {channel.channelTitle}
            </p>
            <form action={disconnectChannel}>
              <Button type="submit" variant="outline">
                채널 연동 해제
              </Button>
            </form>
          </>
        )}
      </section>

      <section className="space-y-3 rounded-2xl bg-risk-high-bg px-5 py-4">
        <h2 className="text-sm font-medium text-risk-high">위험 구역</h2>
        <p className="text-xs text-muted-foreground">
          계정을 삭제하면 연동 정보와 분석된 댓글이 모두 영구히 삭제되고,
          되돌릴 수 없습니다.
        </p>
        <form action={deleteAccount}>
          <DangerZoneButton confirmMessage="정말로 계정을 삭제하시겠습니까? 모든 데이터가 영구히 삭제되며 되돌릴 수 없습니다.">
            계정 삭제
          </DangerZoneButton>
        </form>
      </section>
    </main>
  );
}
