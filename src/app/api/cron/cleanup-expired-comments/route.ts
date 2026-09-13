import { NextResponse } from "next/server";

import { getAllChannels } from "@/lib/db/queries/channels";
import { deleteExpiredComments } from "@/lib/db/queries/comments";
import { getRetentionDaysForUser } from "@/lib/db/queries/subscriptions";

// Vercel Fluid Compute 기본 300초 한도까지 명시적으로 확보
export const maxDuration = 300;

// vercel.json에서 하루 한 번(process-comments/process-billing과 겹치지 않는
// 새벽 시간대)에 호출. 플랜별 데이터 보관 기간(무료 7일/베이직 30일/플러스
// 180일/프로 무제한)을 넘긴 댓글을 계정 단위로 지운다 — 증거 보관함에 저장한
// 댓글(isArchived=true)은 보관 기간과 무관하게 절대 지우지 않는다.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const channels = await getAllChannels();
  const userIds = [...new Set(channels.map((c) => c.userId))];
  const results = [];

  for (const userId of userIds) {
    try {
      const retentionDays = await getRetentionDaysForUser(userId);

      if (retentionDays === null) {
        results.push({ userId, deleted: 0, retention: "unlimited" });
        continue;
      }

      const cutoff = new Date(
        Date.now() - retentionDays * 24 * 60 * 60 * 1000,
      );
      const deleted = await deleteExpiredComments(userId, cutoff);
      results.push({ userId, deleted, retentionDays });
    } catch (e) {
      results.push({ userId, deleted: "failed" });
      console.error(`[cron] 데이터 보관 기간 정리 실패 (userId=${userId}):`, e);
    }
  }

  return NextResponse.json({ processedUsers: results.length, results });
}
