import { NextResponse } from "next/server";

import { cancelSubscription } from "@/lib/db/queries/subscriptions";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const ok = await cancelSubscription(user.id);
  if (!ok) {
    return NextResponse.json(
      { error: "구독 중인 플랜이 없습니다." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true });
}
