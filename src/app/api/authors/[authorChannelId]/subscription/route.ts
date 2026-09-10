import { NextResponse } from "next/server";
import { z } from "zod";

import { getChannelById } from "@/lib/db/queries/channels";
import {
  subscribeToAuthor,
  unsubscribeFromAuthor,
} from "@/lib/db/queries/notifications";
import { createClient } from "@/lib/supabase/server";

const BodySchema = z.object({
  channelId: z.string(),
  subscribed: z.boolean(),
  authorDisplayName: z.string().nullable().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ authorChannelId: string }> },
) {
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

  const { authorChannelId } = await params;
  const decodedAuthorChannelId = decodeURIComponent(authorChannelId);

  if (body.data.subscribed) {
    await subscribeToAuthor(
      user.id,
      body.data.channelId,
      decodedAuthorChannelId,
      body.data.authorDisplayName ?? null,
    );
  } else {
    await unsubscribeFromAuthor(body.data.channelId, decodedAuthorChannelId);
  }

  return NextResponse.json({ ok: true });
}
