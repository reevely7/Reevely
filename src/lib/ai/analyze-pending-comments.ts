import "server-only";

import { analyzeComment } from "@/lib/ai/analyze-comment";
import {
  getUnanalyzedComments,
  saveAnalysisResult,
} from "@/lib/db/queries/comments";

// 한 번의 배치가 쓰는 OpenAI 호출 수 상한 (비용 방어). cron이 시간마다 도니까
// 최대 하루 24회 × 20개 = 480개가 자연스러운 상한이라 별도 일일 카운터는 안 둔다.
const MAX_BATCH = 20;

export async function analyzePendingComments(userId: string) {
  const pending = await getUnanalyzedComments(userId, MAX_BATCH);

  let analyzed = 0;
  let failed = 0;

  for (const comment of pending) {
    try {
      const result = await analyzeComment(comment.text);
      await saveAnalysisResult(comment.id, result);
      analyzed++;
    } catch (e) {
      console.error(`댓글 분석 실패 (id=${comment.id}):`, e);
      failed++;
    }
  }

  return { totalPending: pending.length, analyzed, failed };
}
