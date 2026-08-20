import "server-only";

import { analyzeComment } from "@/lib/ai/analyze-comment";
import {
  countReviewQueue,
  getUnanalyzedComments,
  saveAnalysisResult,
} from "@/lib/db/queries/comments";
import {
  createNewCommentNotification,
  isSubscribedToAuthor,
  maybeNotifyReviewBacklog,
  maybeNotifyVideoSpike,
  maybeSuggestAuthorSubscription,
} from "@/lib/db/queries/notifications";

// 한 번의 배치가 쓰는 OpenAI 호출 수 상한 (비용 방어). cron이 시간마다 도니까
// 최대 하루 24회 × 20개 = 480개가 자연스러운 상한이라 별도 일일 카운터는 안 둔다.
const MAX_BATCH = 20;

export async function analyzePendingComments(userId: string) {
  const pending = await getUnanalyzedComments(userId, MAX_BATCH);

  let analyzed = 0;
  let failed = 0;
  // 이번 배치 안에서 영상별로 몇 건이 악성으로 나왔는지 — 배치가 끝난 뒤
  // 영상 저격(video_spike) 알림 여부를 판단하는 데 쓴다.
  const videoMaliciousCounts = new Map<
    string,
    { count: number; videoTitle: string | null }
  >();

  for (const comment of pending) {
    try {
      const result = await analyzeComment(comment.text);
      await saveAnalysisResult(comment.id, result);

      if (result.is_malicious) {
        const subscribed = await isSubscribedToAuthor(
          userId,
          comment.authorChannelId,
        );
        if (subscribed) {
          await createNewCommentNotification(
            userId,
            comment.id,
            comment.authorChannelId,
          );
        } else {
          await maybeSuggestAuthorSubscription(
            userId,
            comment.authorChannelId,
            comment.authorDisplayName,
          );
        }

        const entry = videoMaliciousCounts.get(comment.videoId) ?? {
          count: 0,
          videoTitle: comment.videoTitle,
        };
        entry.count += 1;
        videoMaliciousCounts.set(comment.videoId, entry);
      }
      analyzed++;
    } catch (e) {
      console.error(`댓글 분석 실패 (id=${comment.id}):`, e);
      failed++;
    }
  }

  for (const [videoId, { count, videoTitle }] of videoMaliciousCounts) {
    await maybeNotifyVideoSpike(userId, videoId, videoTitle, count);
  }

  const backlogCount = await countReviewQueue(userId);
  await maybeNotifyReviewBacklog(userId, backlogCount);

  return { totalPending: pending.length, analyzed, failed };
}
