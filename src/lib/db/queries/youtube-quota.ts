import "server-only";

import { desc, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { youtubeApiUsage } from "@/lib/db/schema";

// YouTube Data API 공식 unit 비용 — 이 프로젝트가 쓰는 읽기 엔드포인트는
// 전부 1유닛이다 (search.list처럼 비싼 엔드포인트는 안 쓴다).
export const YOUTUBE_API_UNIT_COSTS = {
  playlistItemsList: 1,
  videosList: 1,
  commentThreadsList: 1,
  channelsList: 1,
} as const;

function todayUtcDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

// 실패한 요청도 대부분 쿼터를 소모하므로, 응답 성공 여부와 무관하게 호출
// 직후 기록한다. 기록 자체가 실패해도 sync/연동을 막으면 안 되니 best-effort로
// 처리한다.
export async function recordYoutubeApiUsage(units: number) {
  try {
    const date = todayUtcDateString();
    await db
      .insert(youtubeApiUsage)
      .values({ date, units })
      .onConflictDoUpdate({
        target: youtubeApiUsage.date,
        set: { units: sql`${youtubeApiUsage.units} + ${units}` },
      });
  } catch (e) {
    console.error("[youtube] 쿼터 사용량 기록 실패:", e);
  }
}

// 관리자 시스템 모니터링 전용 — 최근 N일 일별 사용량 (date 오름차순)
export async function getYoutubeApiUsageRecent(days = 7) {
  return db
    .select()
    .from(youtubeApiUsage)
    .orderBy(desc(youtubeApiUsage.date))
    .limit(days);
}
