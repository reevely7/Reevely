import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { connectChannel } from "@/lib/youtube/connect-channel";
import { exchangeAuthCodeForTokens } from "@/lib/youtube/exchange-auth-code";

const STATE_COOKIE = "channel_connect_state";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/`);
  }

  const cookieStore = await cookies();
  const savedState = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);

  if (!code || !state || !savedState || state !== savedState) {
    return NextResponse.redirect(`${origin}/onboarding?error=channel_connect`);
  }

  try {
    const { accessToken, refreshToken } = await exchangeAuthCodeForTokens(
      code,
      `${origin}/channel-connect/callback`,
    );
    await connectChannel({ userId: user.id, accessToken, refreshToken });
    return NextResponse.redirect(`${origin}/dashboard`);
  } catch (e) {
    console.error("채널 연동 실패:", e);
    return NextResponse.redirect(`${origin}/onboarding?error=channel_connect`);
  }
}
