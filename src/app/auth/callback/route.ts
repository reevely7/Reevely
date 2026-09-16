import { NextResponse } from "next/server";

import { getChannelsByUserId } from "@/lib/db/queries/channels";
import { isSignupCompleted } from "@/lib/auth/signup-status";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session && data.user) {
      if (!isSignupCompleted(data.user)) {
        return NextResponse.redirect(`${origin}/signup/complete`);
      }

      const channels = await getChannelsByUserId(data.user.id);
      return NextResponse.redirect(
        `${origin}${channels.length > 0 ? `/c/${channels[0].id}/dashboard` : "/onboarding"}`,
      );
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth`);
}
