import "server-only";

import { redirect } from "next/navigation";

import { getChannelsByUserId } from "@/lib/db/queries/channels";
import { isSignupCompleted } from "@/lib/auth/signup-status";
import { createClient } from "@/lib/supabase/server";

export async function requireChannels() {
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
  if (channels.length === 0) {
    redirect("/onboarding");
  }

  const nickname = (user.user_metadata?.nickname as string | undefined) || null;

  return { user, channels, nickname };
}
