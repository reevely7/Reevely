import { NextResponse } from "next/server";

import { markAllNotificationsRead } from "@/lib/db/queries/notifications";
import { createClient } from "@/lib/supabase/server";

export async function PATCH() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  await markAllNotificationsRead(user.id);

  return NextResponse.json({ ok: true });
}
