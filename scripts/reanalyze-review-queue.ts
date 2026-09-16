// 검토 필요(needs_review) 댓글을 최신 프롬프트로 재분석해 기존 판정
// (risk_level/category/confidence/reason/uncertainty_reason)을 전부 새로
// 덮어쓴다. 재분석 후 confidence>=0.7로 오르면 saveAnalysisResult의 상태
// 계산 로직에 따라 검토 큐에서 자동으로 빠진다.
// 알림 발송·월간 분석량 차감 등 cron 파이프라인의 부가효과는 의도적으로
// 건너뛴다 — 신규 댓글 이벤트가 아니라 기존 판정 갱신이라서다.
// 실행: npm run db:reanalyze-review-queue
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import { eq } from "drizzle-orm";

import { analyzeComment } from "../src/lib/ai/analyze-comment";
import { db } from "../src/lib/db";
import { saveAnalysisResult } from "../src/lib/db/queries/comments";
import { comments } from "../src/lib/db/schema";
import { mapWithConcurrency } from "../src/lib/utils/concurrency";

const CONCURRENCY = 5;

async function main() {
  const pending = await db
    .select({ id: comments.id, text: comments.text })
    .from(comments)
    .where(eq(comments.status, "needs_review"));

  console.log(`검토 필요 댓글 ${pending.length}건 재분석 시작`);

  let succeeded = 0;
  let failed = 0;

  await mapWithConcurrency(pending, CONCURRENCY, async (comment) => {
    try {
      const { analysis, usage } = await analyzeComment(comment.text);
      await saveAnalysisResult(comment.id, analysis, usage);
      succeeded++;
    } catch (e) {
      console.error(`재분석 실패 (id=${comment.id}):`, e);
      failed++;
    }
  });

  console.log(`완료: 성공 ${succeeded}건, 실패 ${failed}건`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
