import { NextResponse } from "next/server";
import { z } from "zod";

import { setPendingPlan } from "@/lib/db/queries/subscriptions";
import { createClient } from "@/lib/supabase/server";

const BodySchema = z.object({
  plan: z.enum(["basic", "plus", "pro"]),
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

  const ok = await setPendingPlan(user.id, body.data.plan);
  if (!ok) {
    return NextResponse.json(
      { error: "구독 중인 플랜이 없습니다. 먼저 결제를 진행해 주세요." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true });
}
