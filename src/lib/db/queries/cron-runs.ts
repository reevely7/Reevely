import "server-only";

import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { cronRuns } from "@/lib/db/schema";

type CronRunResult = {
  itemCount: number;
  errorCount: number;
  summary: unknown;
};

// cron 라우트의 핵심 로직을 감싸는 헬퍼 — 성공/예외 여부와 무관하게 실행
// 이력을 1건 남긴다. fn이 던지면 fatalError로 기록하고 그대로 다시 던진다
// (기존 cron의 에러 응답 동작은 안 바뀐다). 인증 실패(401) 요청은 여기 오기
// 전에 걸러지므로 로그에 안 남는다.
export async function recordCronRun<T extends CronRunResult>(
  cronName: string,
  fn: () => Promise<T>,
): Promise<T> {
  const startedAt = new Date();
  try {
    const result = await fn();
    await db.insert(cronRuns).values({
      cronName,
      startedAt,
      finishedAt: new Date(),
      itemCount: result.itemCount,
      errorCount: result.errorCount,
      summary: result.summary,
    });
    return result;
  } catch (e) {
    await db.insert(cronRuns).values({
      cronName,
      startedAt,
      finishedAt: new Date(),
      fatalError: e instanceof Error ? e.message : String(e),
    });
    throw e;
  }
}

export async function getCronRuns(cronName?: string, limit = 50) {
  return db
    .select()
    .from(cronRuns)
    .where(cronName ? eq(cronRuns.cronName, cronName) : undefined)
    .orderBy(desc(cronRuns.startedAt))
    .limit(limit);
}
