import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { DangerZoneButton } from "@/components/settings/danger-zone-button";
import {
  deleteChannelByUserId,
  getChannelByUserId,
} from "@/lib/db/queries/channels";
import { deleteCommentsByUserId } from "@/lib/db/queries/comments";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const channel = await getChannelByUserId(user.id);
  const userId = user.id;

  async function disconnectChannel() {
    "use server";
    await deleteChannelByUserId(userId);
    redirect("/onboarding");
  }

  async function deleteAccount() {
    "use server";
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
          설정
        </p>
      </header>

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
