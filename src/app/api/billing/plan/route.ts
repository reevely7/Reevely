import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getSubscriptionByUserId,
  PLAN_ORDER,
  setPendingPlan,
} from "@/lib/db/queries/subscriptions";
import { createClient } from "@/lib/supabase/server";

const BodySchema = z.object({
  plan: z.enum(["basic", "plus", "pro"]),
});

// 다운그레이드 예약 전용 — 다음 결제일부터 반영되며 지금 결제는 발생하지
// 않는다. 상위 플랜으로의 즉시 결제는 /api/billing/upgrade를 쓴다.
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

  const subscription = await getSubscriptionByUserId(user.id);
  if (!subscription) {
    return NextResponse.json(
      { error: "구독 중인 플랜이 없습니다. 먼저 결제를 진행해 주세요." },
      { status: 404 },
    );
  }

  if (PLAN_ORDER[body.data.plan] >= PLAN_ORDER[subscription.plan]) {
    return NextResponse.json(
      { error: "다운그레이드만 예약할 수 있습니다. 업그레이드는 즉시 결제로 진행해 주세요." },
      { status: 400 },
    );
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
