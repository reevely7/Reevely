import { redirect } from "next/navigation";

import { MypageNav } from "@/components/mypage/mypage-nav";
import { Button } from "@/components/ui/button";
import { DangerZoneButton } from "@/components/settings/danger-zone-button";
import {
  deleteChannelById,
  deleteChannelByUserId,
  getChannelsByUserId,
} from "@/lib/db/queries/channels";
import { deleteCommentsByUserId } from "@/lib/db/queries/comments";
import { deleteNotificationsByUserId } from "@/lib/db/queries/notifications";
import { getChannelLimitForUser } from "@/lib/db/queries/subscriptions";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const ERROR_MESSAGES: Record<string, string> = {
  channel_limit: "현재 플랜의 채널 연동 한도에 도달했습니다. 플랜을 업그레이드해 주세요.",
};

export default async function MypageAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const errorMessage = error ? ERROR_MESSAGES[error] : undefined;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const userId = user.id;
  const channels = await getChannelsByUserId(userId);
  const channelLimit = await getChannelLimitForUser(userId);
  const atChannelLimit =
    channels.filter((c) => c.status === "active").length >= channelLimit;

  async function disconnectChannel(formData: FormData) {
    "use server";
    const channelId = String(formData.get("channelId"));

    // IDOR 방지: Server Action은 렌더된 폼 없이도 직접 호출될 수 있으므로,
    // channelId가 실제로 현재 유저 소유인지 확인한 뒤에만 삭제한다.
    const ownsChannel = channels.some((c) => c.id === channelId);
    if (!ownsChannel) {
      redirect("/mypage/account");
    }

    await deleteChannelById(channelId);
    redirect("/mypage/account");
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

      {errorMessage && (
        <p className="rounded-md bg-risk-high-bg px-3 py-2 text-xs text-risk-high">
          {errorMessage}
        </p>
      )}

      <section className="space-y-3 rounded-2xl bg-card px-5 py-4">
        <h2 className="text-sm font-medium text-card-foreground">
          연동된 채널 ({channels.length}개)
        </h2>
        {channels.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            연동된 채널이 없습니다.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {channels.map((channel) => (
              <li
                key={channel.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
              >
                <span className="text-sm text-muted-foreground">
                  {channel.channelTitle}
                  {channel.status === "locked" && (
                    <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                      잠김
                    </span>
                  )}
                  {channel.reauthRequiredAt && (
                    <span className="ml-2 rounded-full bg-risk-high-bg px-2 py-0.5 text-[11px] text-risk-high">
                      연동 끊김
                    </span>
                  )}
                </span>
                <form action={disconnectChannel}>
                  <input type="hidden" name="channelId" value={channel.id} />
                  <Button type="submit" variant="outline" size="sm">
                    연동 해제
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <Button
          nativeButton={false}
          variant="outline"
          render={
            <a
              href={
                atChannelLimit
                  ? "/mypage/account?error=channel_limit"
                  : "/channel-connect/start"
              }
            >
              채널 추가
            </a>
          }
        />
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
