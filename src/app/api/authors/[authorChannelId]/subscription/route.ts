import { NextResponse } from "next/server";
import { z } from "zod";

import {
  subscribeToAuthor,
  unsubscribeFromAuthor,
} from "@/lib/db/queries/notifications";
import { createClient } from "@/lib/supabase/server";

const BodySchema = z.object({
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

  const { authorChannelId } = await params;
  const decodedAuthorChannelId = decodeURIComponent(authorChannelId);

  if (body.data.subscribed) {
    await subscribeToAuthor(
      user.id,
      decodedAuthorChannelId,
      body.data.authorDisplayName ?? null,
    );
  } else {
    await unsubscribeFromAuthor(user.id, decodedAuthorChannelId);
  }

  return NextResponse.json({ ok: true });
}
