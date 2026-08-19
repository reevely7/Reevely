import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { LogoutButton } from "@/components/auth/logout-button";
import { Button } from "@/components/ui/button";
import { getChannelByUserId } from "@/lib/db/queries/channels";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const channel = await getChannelByUserId(user.id);

  if (!channel) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          연동된 채널이 없습니다.
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          채널 연동을 해제했거나, 연동된 구글 계정에 유튜브 채널이 없는
          경우입니다. 채널이 있는 계정으로 다시 연동해 주세요.
        </p>
        <div className="w-full max-w-xs">
          <GoogleSignInButton />
        </div>
        <LogoutButton />
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="text-sm text-muted-foreground">이 채널이 맞나요?</p>

      <div className="flex flex-col items-center gap-3 rounded-2xl bg-card px-8 py-8">
        {channel.thumbnailUrl && (
          <Image
            src={channel.thumbnailUrl}
            alt={channel.channelTitle}
            width={64}
            height={64}
            priority
            className="rounded-full"
          />
        )}
        <h1 className="text-xl font-semibold tracking-tight text-card-foreground">
          {channel.channelTitle}
        </h1>
        {channel.subscriberCount != null && (
          <p className="font-mono text-xs text-muted-foreground">
            구독자 {channel.subscriberCount.toLocaleString("ko-KR")}명
          </p>
        )}
      </div>

      <Button
        nativeButton={false}
        render={<Link href="/dashboard">대시보드로 이동</Link>}
      />
    </main>
  );
}
