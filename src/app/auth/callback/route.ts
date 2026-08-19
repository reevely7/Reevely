import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { connectChannel } from "@/lib/youtube/connect-channel";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/onboarding";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session && data.user) {
      const accessToken = data.session.provider_token;

      if (!accessToken) {
        return NextResponse.redirect(`${origin}/?error=no_provider_token`);
      }

      try {
        // provider_refresh_token은 최초 OAuth 응답에만 실려온다 — 여기서 못 잡으면 다시 못 얻는다
        await connectChannel({
          userId: data.user.id,
          accessToken,
          refreshToken: data.session.provider_refresh_token ?? null,
        });
        return NextResponse.redirect(`${origin}${next}`);
      } catch (e) {
        console.error("채널 연동 실패:", e);
        return NextResponse.redirect(`${origin}/?error=channel_connect`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth`);
}
