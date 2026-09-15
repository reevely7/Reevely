import "server-only";

import { analyzeComment } from "@/lib/ai/analyze-comment";
import {
  countAnalyzedCommentsThisMonthByUserId,
  countReviewQueue,
  getUnanalyzedComments,
  saveAnalysisResult,
} from "@/lib/db/queries/comments";
import {
  createNewCommentNotification,
  isSubscribedToAuthor,
  maybeNotifyAnalysisQuotaReached,
  maybeNotifyReviewBacklog,
  maybeNotifyVideoSpike,
  maybeSuggestAuthorSubscription,
} from "@/lib/db/queries/notifications";
import { getMonthlyAnalysisLimitForUser } from "@/lib/db/queries/subscriptions";
import { mapWithConcurrency } from "@/lib/utils/concurrency";

// 한 번의 배치가 쓰는 OpenAI 호출 수 상한 (비용 방어). cron이 시간마다 도니까
// 최대 하루 24회 × 20개 = 480개가 자연스러운 상한이라 별도 일일 카운터는 안 둔다.
// (플랜별 월 분석량 한도와는 별개 — 그건 아래에서 계정 단위로 따로 체크한다)
const MAX_BATCH = 20;
// 배치 크기가 이미 fetch 시점에 고정돼 있어 동시 처리해도 한도 계산과는
// 무관하다. 같은 작성자가 한 배치에서 동시에 여러 건 악성 판정을 받으면
// repeat_author 임계치 알림이 드물게 중복 생성될 수 있는 정도의 트레이드오프.
const ANALYZE_CONCURRENCY = 5;

export async function analyzePendingComments(userId: string, channelId: string) {
  const [monthlyLimit, analyzedThisMonth] = await Promise.all([
    getMonthlyAnalysisLimitForUser(userId),
    countAnalyzedCommentsThisMonthByUserId(userId),
  ]);
  const remainingQuota = monthlyLimit - analyzedThisMonth;

  if (remainingQuota <= 0) {
    await maybeNotifyAnalysisQuotaReached(userId);
    return { totalPending: 0, analyzed: 0, failed: 0, quotaReached: true };
  }

  const pending = await getUnanalyzedComments(
    channelId,
    Math.min(MAX_BATCH, remainingQuota),
  );

  let analyzed = 0;
  let failed = 0;
  // 이번 배치 안에서 영상별로 몇 건이 악성으로 나왔는지, 위험도별로는 몇 건인지
  // — 배치가 끝난 뒤 영상 저격(video_spike) 알림 여부·문구를 판단하는 데 쓴다.
  const videoMaliciousCounts = new Map<
    string,
    {
      count: number;
      videoTitle: string | null;
      riskCounts: { high: number; medium: number; low: number };
    }
  >();

  await mapWithConcurrency(pending, ANALYZE_CONCURRENCY, async (comment) => {
    try {
      const { analysis, usage } = await analyzeComment(comment.text);
      await saveAnalysisResult(comment.id, analysis, usage);

      if (analysis.is_malicious) {
        const subscribed = await isSubscribedToAuthor(
          channelId,
          comment.authorChannelId,
        );
        if (subscribed) {
          await createNewCommentNotification(
            userId,
            channelId,
            comment.id,
            comment.authorChannelId,
          );
        } else {
          await maybeSuggestAuthorSubscription(
            userId,
            channelId,
            comment.authorChannelId,
            comment.authorDisplayName,
          );
        }

        const entry = videoMaliciousCounts.get(comment.videoId) ?? {
          count: 0,
          videoTitle: comment.videoTitle,
          riskCounts: { high: 0, medium: 0, low: 0 },
        };
        entry.count += 1;
        entry.riskCounts[analysis.risk_level] += 1;
        videoMaliciousCounts.set(comment.videoId, entry);
      }
      analyzed++;
    } catch (e) {
      console.error(`댓글 분석 실패 (id=${comment.id}):`, e);
      failed++;
    }
  });

  for (const [videoId, { count, videoTitle, riskCounts }] of videoMaliciousCounts) {
    await maybeNotifyVideoSpike(userId, channelId, videoId, videoTitle, count, riskCounts);
  }

  const backlogCount = await countReviewQueue(channelId);
  await maybeNotifyReviewBacklog(userId, channelId, backlogCount);

  return { totalPending: pending.length, analyzed, failed };
}
