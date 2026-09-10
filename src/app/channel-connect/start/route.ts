import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { getChannelsByUserId } from "@/lib/db/queries/channels";
import {
  FREE_CHANNEL_LIMIT,
  getSubscriptionByUserId,
  PLAN_CHANNEL_LIMITS,
} from "@/lib/db/queries/subscriptions";

const STATE_COOKIE = "channel_connect_state";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const existingChannels = await getChannelsByUserId(user.id);
  const subscription = await getSubscriptionByUserId(user.id);
  const limit = subscription
    ? PLAN_CHANNEL_LIMITS[subscription.plan]
    : FREE_CHANNEL_LIMIT;
  const activeCount = existingChannels.filter((c) => c.status === "active").length;

  if (activeCount >= limit) {
    return NextResponse.redirect(
      new URL("/mypage/account?error=channel_limit", request.url),
    );
  }

  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  const { origin } = new URL(request.url);
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
  authUrl.searchParams.set(
    "redirect_uri",
    `${origin}/channel-connect/callback`,
  );
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set(
    "scope",
    "https://www.googleapis.com/auth/youtube.force-ssl",
  );
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl);
}
