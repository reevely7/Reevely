import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";

import {
  countMaliciousCommentsByAuthor,
  countMaliciousCommentsInRange,
} from "@/lib/db/queries/comments";
import { db } from "@/lib/db";
import { authorSubscriptions, comments, notifications } from "@/lib/db/schema";

type NotificationType =
  | "new_comment"
  | "repeat_author"
  | "review_backlog"
  | "video_spike"
  | "weekly_digest";

const REPEAT_AUTHOR_THRESHOLD = 3;
const VIDEO_SPIKE_THRESHOLD = 3;
const REVIEW_BACKLOG_THRESHOLD = 5;
const WEEKLY_DIGEST_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

export async function isSubscribedToAuthor(
  userId: string,
  authorChannelId: string,
) {
  const [row] = await db
    .select({ id: authorSubscriptions.id })
    .from(authorSubscriptions)
    .where(
      and(
        eq(authorSubscriptions.userId, userId),
        eq(authorSubscriptions.authorChannelId, authorChannelId),
      ),
    )
    .limit(1);

  return Boolean(row);
}

export async function subscribeToAuthor(
  userId: string,
  authorChannelId: string,
  authorDisplayName: string | null,
) {
  await db
    .insert(authorSubscriptions)
    .values({ userId, authorChannelId, authorDisplayName })
    .onConflictDoNothing({
      target: [authorSubscriptions.userId, authorSubscriptions.authorChannelId],
    });
}

export async function unsubscribeFromAuthor(
  userId: string,
  authorChannelId: string,
) {
  await db
    .delete(authorSubscriptions)
    .where(
      and(
        eq(authorSubscriptions.userId, userId),
        eq(authorSubscriptions.authorChannelId, authorChannelId),
      ),
    );
}

async function hasUnreadNotificationOfType(
  userId: string,
  type: NotificationType,
  refId?: string,
) {
  const conditions = [
    eq(notifications.userId, userId),
    eq(notifications.type, type),
    eq(notifications.isRead, false),
  ];
  if (refId) conditions.push(eq(notifications.refId, refId));

  const [row] = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(...conditions))
    .limit(1);

  return Boolean(row);
}

// cron 분석 파이프라인 전용 — 구독 중인 작성자의 새 악성 댓글 알림.
// 호출 전에 isSubscribedToAuthor로 이미 구독 여부를 확인했다고 가정한다.
export async function createNewCommentNotification(
  userId: string,
  commentId: string,
  authorChannelId: string,
) {
  await db.insert(notifications).values({
    userId,
    type: "new_comment",
    commentId,
    href: `/authors/${encodeURIComponent(authorChannelId)}`,
  });
}

// 아직 구독 안 한 작성자가 누적 REPEAT_AUTHOR_THRESHOLD번째 악성 댓글을 남긴
// "바로 그 순간"에만 1회 생성된다 (count === 임계치일 때만 조건이 참이라 별도
// 중복 방지 없이도 자연스럽게 한 번만 발생한다).
export async function maybeSuggestAuthorSubscription(
  userId: string,
  authorChannelId: string,
  authorDisplayName: string | null,
) {
  const count = await countMaliciousCommentsByAuthor(userId, authorChannelId);
  if (count !== REPEAT_AUTHOR_THRESHOLD) return;

  await db.insert(notifications).values({
    userId,
    type: "repeat_author",
    title: "반복 작성자 발견",
    message: `${authorDisplayName ?? "이 작성자"}님이 벌써 ${REPEAT_AUTHOR_THRESHOLD}번째 악성 댓글을 남겼어요. 알림을 받아볼까요?`,
    href: `/authors/${encodeURIComponent(authorChannelId)}`,
    refId: authorChannelId,
  });
}

// 한 번의 분석 배치 안에서 특정 영상에 VIDEO_SPIKE_THRESHOLD건 이상 악성 댓글이
// 몰렸을 때. 같은 영상에 대해 안읽은 알림이 이미 있으면 또 만들지 않는다.
export async function maybeNotifyVideoSpike(
  userId: string,
  videoId: string,
  videoTitle: string | null,
  count: number,
) {
  if (count < VIDEO_SPIKE_THRESHOLD) return;
  if (await hasUnreadNotificationOfType(userId, "video_spike", videoId)) return;

  await db.insert(notifications).values({
    userId,
    type: "video_spike",
    title: "영상에 악성 댓글이 몰리고 있어요",
    message: `"${videoTitle ?? videoId}" 영상에 최근 ${count}건의 악성 댓글이 발생했습니다.`,
    href: `/dashboard?video=${encodeURIComponent(videoId)}`,
    refId: videoId,
  });
}

// 검토 필요 큐가 REVIEW_BACKLOG_THRESHOLD건 이상 쌓였을 때. 안읽은 알림이
// 이미 있으면 다시 만들지 않고, 읽고 나서 다시 임계치를 넘으면 또 알린다.
export async function maybeNotifyReviewBacklog(
  userId: string,
  backlogCount: number,
) {
  if (backlogCount < REVIEW_BACKLOG_THRESHOLD) return;
  if (await hasUnreadNotificationOfType(userId, "review_backlog")) return;

  await db.insert(notifications).values({
    userId,
    type: "review_backlog",
    title: "검토 필요 댓글이 쌓이고 있어요",
    message: `확신도가 낮아 검토가 필요한 댓글이 ${backlogCount}건입니다.`,
    href: "/review",
  });
}

function formatWeeklyDiff(thisWeek: number, lastWeek: number): string {
  if (lastWeek === 0) {
    return thisWeek === 0 ? "지난주와 동일" : `${thisWeek}건 증가`;
  }
  const diff = thisWeek - lastWeek;
  if (diff === 0) return "지난주와 동일";
  const percent = Math.round((diff / lastWeek) * 100);
  return `${percent > 0 ? "+" : ""}${percent}%`;
}

// cron이 매시간 돌 때마다 호출되지만, 최근 생성된 weekly_digest 알림이
// 7일 이내면 그냥 넘어간다 — 별도 주간 전용 cron 없이 기존 시간별 cron
// 안에서 "때가 됐을 때만" 실행되는 방식.
export async function maybeCreateWeeklyDigest(userId: string) {
  const [latest] = await db
    .select({ createdAt: notifications.createdAt })
    .from(notifications)
    .where(
      and(eq(notifications.userId, userId), eq(notifications.type, "weekly_digest")),
    )
    .orderBy(desc(notifications.createdAt))
    .limit(1);

  const now = new Date();
  if (latest && now.getTime() - latest.createdAt.getTime() < WEEKLY_DIGEST_INTERVAL_MS) {
    return;
  }

  const oneWeekAgo = new Date(now.getTime() - WEEKLY_DIGEST_INTERVAL_MS);
  const twoWeeksAgo = new Date(now.getTime() - WEEKLY_DIGEST_INTERVAL_MS * 2);
  const [thisWeek, lastWeek] = await Promise.all([
    countMaliciousCommentsInRange(userId, oneWeekAgo, now),
    countMaliciousCommentsInRange(userId, twoWeeksAgo, oneWeekAgo),
  ]);

  // 첫 주(비교 대상 없음)인데 이번 주도 0건이면 보낼 내용이 없으니 생략
  if (thisWeek === 0 && lastWeek === 0) return;

  await db.insert(notifications).values({
    userId,
    type: "weekly_digest",
    title: "이번 주 요약",
    message: `이번 주 위험 댓글 ${thisWeek}건 (지난주 대비 ${formatWeeklyDiff(thisWeek, lastWeek)})`,
    href: "/dashboard",
  });
}

export async function countUnreadNotifications(userId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

  return row?.count ?? 0;
}

export async function getNotifications(userId: string, limit?: number) {
  const query = db
    .select({
      id: notifications.id,
      type: notifications.type,
      isRead: notifications.isRead,
      createdAt: notifications.createdAt,
      title: notifications.title,
      message: notifications.message,
      href: notifications.href,
      commentText: comments.text,
      riskLevel: comments.riskLevel,
      category: comments.category,
      authorDisplayName: comments.authorDisplayName,
      videoId: comments.videoId,
      videoTitle: comments.videoTitle,
    })
    .from(notifications)
    .leftJoin(comments, eq(notifications.commentId, comments.id))
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt));

  return limit ? query.limit(limit) : query;
}

export async function markNotificationRead(id: string, userId: string) {
  const updated = await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
    .returning({ id: notifications.id });

  return updated.length > 0;
}

export async function markAllNotificationsRead(userId: string) {
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
}

// 계정 삭제 시 함께 정리한다
export async function deleteNotificationsByUserId(userId: string) {
  await db.delete(notifications).where(eq(notifications.userId, userId));
  await db
    .delete(authorSubscriptions)
    .where(eq(authorSubscriptions.userId, userId));
}
