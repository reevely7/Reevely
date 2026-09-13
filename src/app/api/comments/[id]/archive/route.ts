import { NextResponse } from "next/server";
import { z } from "zod";

import { getChannelById } from "@/lib/db/queries/channels";
import {
  archiveComment,
  countArchivedCommentsByUserId,
  unarchiveComment,
} from "@/lib/db/queries/comments";
import { getEvidenceArchiveLimitForUser } from "@/lib/db/queries/subscriptions";
import { createClient } from "@/lib/supabase/server";

const BodySchema = z.object({
  channelId: z.string(),
  archived: z.boolean(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
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

  const { id } = await params;

  if (body.data.archived) {
    const [limit, currentCount] = await Promise.all([
      getEvidenceArchiveLimitForUser(user.id),
      countArchivedCommentsByUserId(user.id),
    ]);

    if (limit !== null && currentCount >= limit) {
      return NextResponse.json(
        {
          error:
            limit === 0
              ? "증거 보관함은 유료 플랜에서 이용할 수 있습니다. 플랜을 업그레이드해 주세요."
              : `증거 보관함 한도(${limit}건)에 도달했습니다. 플랜을 업그레이드하거나 기존 항목을 정리해 주세요.`,
        },
        { status: 403 },
      );
    }

    const updated = await archiveComment(id, body.data.channelId);
    if (!updated) {
      return NextResponse.json({ error: "댓글을 찾을 수 없습니다." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  }

  const updated = await unarchiveComment(id, body.data.channelId);
  if (!updated) {
    return NextResponse.json({ error: "댓글을 찾을 수 없습니다." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
