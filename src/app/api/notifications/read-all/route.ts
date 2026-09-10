import { NextResponse } from "next/server";
import { z } from "zod";

import { markAllNotificationsRead } from "@/lib/db/queries/notifications";
import { createClient } from "@/lib/supabase/server";

const BodySchema = z.object({
  channelId: z.string(),
});

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = BodySchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  await markAllNotificationsRead(body.data.channelId);

  return NextResponse.json({ ok: true });
}
