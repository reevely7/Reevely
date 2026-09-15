import { NextResponse } from "next/server";
import { z } from "zod";

import { getChannelById } from "@/lib/db/queries/channels";
import { updateCommentStatusBulk } from "@/lib/db/queries/comments";
import { createClient } from "@/lib/supabase/server";

const BodySchema = z.object({
  channelId: z.string(),
  commentIds: z.array(z.string()).min(1).max(100),
  status: z.enum(["confirmed", "reported_false", "whitelisted"]),
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

  const channel = await getChannelById(body.data.channelId);
  if (!channel || channel.userId !== user.id) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const updatedCount = await updateCommentStatusBulk(
    body.data.commentIds,
    body.data.channelId,
    body.data.status,
  );

  return NextResponse.json({ ok: true, updatedCount });
}
