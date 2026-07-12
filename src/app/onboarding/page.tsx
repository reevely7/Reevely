import Image from "next/image";
import { redirect } from "next/navigation";

import { getChannelByUserId } from "@/lib/db/queries/channels";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const channel = await getChannelByUserId(user.id);

  if (!channel) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="font-heading text-2xl text-foreground">
          채널 연동에 실패했습니다.
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          연동된 구글 계정에서 유튜브 채널을 찾지 못했습니다. 채널이 있는
          계정으로 다시 로그인해 주세요.
        </p>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="text-sm text-muted-foreground">이 채널이 맞나요?</p>

      <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card px-8 py-8">
        {channel.thumbnailUrl && (
          <Image
            src={channel.thumbnailUrl}
            alt={channel.channelTitle}
            width={64}
            height={64}
            className="rounded-full"
          />
        )}
        <h1 className="font-heading text-xl text-card-foreground">
          {channel.channelTitle}
        </h1>
        {channel.subscriberCount != null && (
          <p className="font-mono text-xs text-muted-foreground">
            구독자 {channel.subscriberCount.toLocaleString("ko-KR")}명
          </p>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        채널 연동이 완료됐습니다. 댓글 분석 기능은 다음 단계에서 연결됩니다.
      </p>
    </main>
  );
}
