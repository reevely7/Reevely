import { NextResponse } from "next/server";
import { z } from "zod";

import { updateCommentStatus } from "@/lib/db/queries/comments";
import { createClient } from "@/lib/supabase/server";

const BodySchema = z.object({
  status: z.enum(["confirmed", "reported_false", "whitelisted"]),
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

  const { id } = await params;
  const updated = await updateCommentStatus(id, user.id, body.data.status);

  if (!updated) {
    return NextResponse.json({ error: "댓글을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
