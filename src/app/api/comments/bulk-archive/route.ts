import { NextResponse } from "next/server";
import { z } from "zod";

import { getChannelById } from "@/lib/db/queries/channels";
import {
  archiveCommentsBulk,
  countArchivedCommentsByUserId,
} from "@/lib/db/queries/comments";
import { getEvidenceArchiveLimitForUser } from "@/lib/db/queries/subscriptions";
import { createClient } from "@/lib/supabase/server";

const BodySchema = z.object({
  channelId: z.string(),
  commentIds: z.array(z.string()).min(1).max(100),
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

  const [limit, currentCount] = await Promise.all([
    getEvidenceArchiveLimitForUser(user.id),
    countArchivedCommentsByUserId(user.id),
  ]);

  if (limit !== null && currentCount + body.data.commentIds.length > limit) {
    return NextResponse.json(
      {
        error:
          limit === 0
            ? "증거 보관함은 유료 플랜에서 이용할 수 있습니다. 플랜을 업그레이드해 주세요."
            : `증거 보관함 한도(${limit}건)를 초과합니다. 남은 자리: ${Math.max(0, limit - currentCount)}건`,
      },
      { status: 403 },
    );
  }

  const updatedCount = await archiveCommentsBulk(
    body.data.commentIds,
    body.data.channelId,
  );

  return NextResponse.json({ ok: true, updatedCount });
}
