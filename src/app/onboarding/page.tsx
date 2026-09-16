import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/auth/logout-button";
import { getChannelsByUserId } from "@/lib/db/queries/channels";
import { isSignupCompleted } from "@/lib/auth/signup-status";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  if (!isSignupCompleted(user)) {
    redirect("/signup/complete");
  }

  const channels = await getChannelsByUserId(user.id);
  if (channels.length > 0) {
    redirect(`/c/${channels[0].id}/dashboard`);
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        연동된 채널이 없습니다.
      </h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        유튜브 채널을 연동하면 바로 시작할 수 있어요.
      </p>
      <a
        href="/channel-connect/start"
        className="inline-flex h-11 w-full max-w-xs items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        유튜브 채널 연동하기
      </a>
      <LogoutButton />
    </main>
  );
}
