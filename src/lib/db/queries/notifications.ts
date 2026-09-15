import "server-only";

import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";

import {
  countMaliciousCommentsByAuthor,
  countMaliciousCommentsInRange,
  getCategoryBreakdownByAuthor,
} from "@/lib/db/queries/comments";
import { db } from "@/lib/db";
import { authorSubscriptions, comments, notifications } from "@/lib/db/schema";

export type NotificationType =
  | "new_comment"
  | "repeat_author"
  | "review_backlog"
  | "video_spike"
  | "weekly_digest"
  | "payment_failed"
  | "payment_downgraded"
  | "analysis_quota_reached"
  | "reauth_required";

// 낮은 것부터 순서대로 확인 — 한 번의 분석에서 여러 단계를 한꺼번에 넘겨도
// (예: 갑자기 댓글이 몰려 2건→11건) 안 보낸 단계는 전부 각각 알려준다.
const REPEAT_AUTHOR_THRESHOLDS = [3, 10, 30] as const;
const VIDEO_SPIKE_THRESHOLD = 3;
const REVIEW_BACKLOG_THRESHOLD = 5;
const WEEKLY_DIGEST_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

export async function isSubscribedToAuthor(
  channelId: string,
  authorChannelId: string,
) {
  const [row] = await db
    .select({ id: authorSubscriptions.id })
    .from(authorSubscriptions)
    .where(
      and(
        eq(authorSubscriptions.channelId, channelId),
        eq(authorSubscriptions.authorChannelId, authorChannelId),
      ),
    )
    .limit(1);

  return Boolean(row);
}

export async function subscribeToAuthor(
  userId: string,
  channelId: string,
  authorChannelId: string,
  authorDisplayName: string | null,
) {
  await db
    .insert(authorSubscriptions)
    .values({ userId, channelId, authorChannelId, authorDisplayName })
    .onConflictDoNothing({
      target: [authorSubscriptions.channelId, authorSubscriptions.authorChannelId],
    });
}

export async function getAuthorSubscriptions(channelId: string) {
  return db
    .select({
      authorChannelId: authorSubscriptions.authorChannelId,
      authorDisplayName: authorSubscriptions.authorDisplayName,
      createdAt: authorSubscriptions.createdAt,
    })
    .from(authorSubscriptions)
    .where(eq(authorSubscriptions.channelId, channelId))
    .orderBy(desc(authorSubscriptions.createdAt));
}

export async function unsubscribeFromAuthor(
  channelId: string,
  authorChannelId: string,
) {
  await db
    .delete(authorSubscriptions)
    .where(
      and(
        eq(authorSubscriptions.channelId, channelId),
        eq(authorSubscriptions.authorChannelId, authorChannelId),
      ),
    );
}

async function hasUnreadNotificationOfType(
  channelId: string,
  type: NotificationType,
  refId?: string,
) {
  const conditions = [
    eq(notifications.channelId, channelId),
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

// repeat_author처럼 "평생 한 번만" 제안해야 하는 타입용 — 읽음 여부와 무관하게
// 과거에 한 번이라도 만들어진 적 있으면 다시 만들지 않는다.
async function hasEverNotifiedOfType(
  channelId: string,
  type: NotificationType,
  refId: string,
) {
  const [row] = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(
      and(
        eq(notifications.channelId, channelId),
        eq(notifications.type, type),
        eq(notifications.refId, refId),
      ),
    )
    .limit(1);

  return Boolean(row);
}

// cron 분석 파이프라인 전용 — 구독 중인 작성자의 새 악성 댓글 알림.
// 호출 전에 isSubscribedToAuthor로 이미 구독 여부를 확인했다고 가정한다.
export async function createNewCommentNotification(
  userId: string,
  channelId: string,
  commentId: string,
  authorChannelId: string,
) {
  await db.insert(notifications).values({
    userId,
    channelId,
    type: "new_comment",
    commentId,
    href: `/c/${channelId}/authors/${encodeURIComponent(authorChannelId)}`,
  });
}

function repeatAuthorRefId(authorChannelId: string, threshold: number) {
  return `${authorChannelId}:${threshold}`;
}

function formatCategoryBreakdown(
  breakdown: Array<{ category: string; count: number }>,
): string {
  return breakdown
    .slice(0, 2)
    .map((row) => `${row.category} ${row.count}건`)
    .join("·");
}

function repeatAuthorMessage(
  authorDisplayName: string | null,
  threshold: number,
  categoryBreakdown: string,
): string {
  const name = authorDisplayName ?? "이 작성자";
  const suffix = categoryBreakdown ? ` (${categoryBreakdown})` : "";
  if (threshold >= 30) {
    return `${name}님이 누적 ${threshold}번째 악성 댓글을 남겼어요${suffix}. 매우 심각한 수준으로 반복되고 있습니다.`;
  }
  if (threshold >= 10) {
    return `${name}님이 누적 ${threshold}번째 악성 댓글을 남겼어요${suffix}. 반복적으로 문제를 일으키고 있습니다.`;
  }
  return `${name}님이 벌써 ${threshold}번째 악성 댓글을 남겼어요${suffix}. 알림을 받아볼까요?`;
}

// 아직 구독 안 한 작성자가 누적 악성 댓글 수가 REPEAT_AUTHOR_THRESHOLDS의
// 각 단계(3/10/30건)를 넘길 때마다 한 번씩 알린다. count === 임계치인
// "바로 그 순간"에만 걸리는 방식이었더니 (1) 그 순간 일시적으로 구독
// 중이었거나 (2) 이 기능이 생기기 전에 이미 임계치를 넘겨버린 작성자는
// 평생 못 잡는 문제가 있어서, refId(작성자ID+단계) 기준으로 "이 단계를
// 한 번이라도 보낸 적 있는지"를 직접 확인하는 방식으로 바꿨다.
export async function maybeSuggestAuthorSubscription(
  userId: string,
  channelId: string,
  authorChannelId: string,
  authorDisplayName: string | null,
) {
  const count = await countMaliciousCommentsByAuthor(channelId, authorChannelId);

  for (const threshold of REPEAT_AUTHOR_THRESHOLDS) {
    if (count < threshold) break; // 오름차순이라 여기서 못 넘으면 그 위 단계도 못 넘은 것

    const refId = repeatAuthorRefId(authorChannelId, threshold);
    if (await hasEverNotifiedOfType(channelId, "repeat_author", refId)) continue;

    const breakdown = await getCategoryBreakdownByAuthor(channelId, authorChannelId);

    await db.insert(notifications).values({
      userId,
      channelId,
      type: "repeat_author",
      title: "반복 위험 작성자 발견",
      message: repeatAuthorMessage(
        authorDisplayName,
        threshold,
        formatCategoryBreakdown(breakdown),
      ),
      href: `/c/${channelId}/authors/${encodeURIComponent(authorChannelId)}`,
      refId,
    });
  }
}

function formatRiskBreakdown(riskCounts: {
  high: number;
  medium: number;
  low: number;
}): string {
  const parts: string[] = [];
  if (riskCounts.high > 0) parts.push(`High ${riskCounts.high}건`);
  if (riskCounts.medium > 0) parts.push(`Medium ${riskCounts.medium}건`);
  if (riskCounts.low > 0) parts.push(`Low ${riskCounts.low}건`);
  return parts.slice(0, 2).join("·");
}

// 한 번의 분석 배치 안에서 특정 영상에 VIDEO_SPIKE_THRESHOLD건 이상 악성 댓글이
// 몰렸을 때. 같은 영상에 대해 안읽은 알림이 이미 있으면 또 만들지 않는다.
export async function maybeNotifyVideoSpike(
  userId: string,
  channelId: string,
  videoId: string,
  videoTitle: string | null,
  count: number,
  riskCounts: { high: number; medium: number; low: number },
) {
  if (count < VIDEO_SPIKE_THRESHOLD) return;
  if (await hasUnreadNotificationOfType(channelId, "video_spike", videoId)) return;

  await db.insert(notifications).values({
    userId,
    channelId,
    type: "video_spike",
    title: "위험 댓글 급증",
    message: `"${videoTitle ?? videoId}" 영상에서 위험 댓글 ${count}건이 감지됐어요 (${formatRiskBreakdown(riskCounts)}).`,
    href: `/c/${channelId}/dashboard?video=${encodeURIComponent(videoId)}`,
    refId: videoId,
  });
}

// 검토 필요 큐가 REVIEW_BACKLOG_THRESHOLD건 이상 쌓였을 때. 안읽은 알림이
// 이미 있으면 다시 만들지 않고, 읽고 나서 다시 임계치를 넘으면 또 알린다.
export async function maybeNotifyReviewBacklog(
  userId: string,
  channelId: string,
  backlogCount: number,
) {
  if (backlogCount < REVIEW_BACKLOG_THRESHOLD) return;
  if (await hasUnreadNotificationOfType(channelId, "review_backlog")) return;

  await db.insert(notifications).values({
    userId,
    channelId,
    type: "review_backlog",
    title: "검토 필요 댓글이 쌓이고 있어요",
    message: `AI 확신도가 낮아 사용자 확인이 필요한 댓글이 ${backlogCount}건 있습니다.`,
    href: `/c/${channelId}/review`,
  });
}

// 유튜브 연동이 끊긴 "이번 장애"당 딱 1건만 보낸다 — refId로 감지 시각을 쓰므로
// 읽고 나서 또 오지 않고(같은 장애 재알림 없음), 재연동 후 다시 끊기면 새
// reauthRequiredAt이 생겨 새 알림이 나간다.
export async function notifyReauthRequired(
  userId: string,
  channelId: string,
  channelTitle: string,
  reauthRequiredAt: Date,
) {
  const refId = reauthRequiredAt.toISOString();
  if (await hasEverNotifiedOfType(channelId, "reauth_required", refId)) return;

  await db.insert(notifications).values({
    userId,
    channelId,
    type: "reauth_required",
    title: "유튜브 연동을 다시 확인해 주세요",
    message: `"${channelTitle}" 채널의 연동이 끊어져 새 댓글을 가져오지 못하고 있어요. 다시 연동해 주세요.`,
    href: "/channel-connect/start",
    refId,
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
export async function maybeCreateWeeklyDigest(userId: string, channelId: string) {
  const [latest] = await db
    .select({ createdAt: notifications.createdAt })
    .from(notifications)
    .where(
      and(
        eq(notifications.channelId, channelId),
        eq(notifications.type, "weekly_digest"),
      ),
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
    countMaliciousCommentsInRange(channelId, oneWeekAgo, now),
    countMaliciousCommentsInRange(channelId, twoWeeksAgo, oneWeekAgo),
  ]);

  // 첫 주(비교 대상 없음)인데 이번 주도 0건이면 보낼 내용이 없으니 생략
  if (thisWeek === 0 && lastWeek === 0) return;

  await db.insert(notifications).values({
    userId,
    channelId,
    type: "weekly_digest",
    title: "이번 주 요약",
    message: `이번 주 위험 댓글 ${thisWeek}건 (지난주 대비 ${formatWeeklyDiff(thisWeek, lastWeek)})`,
    href: `/c/${channelId}/summary`,
  });
}

export async function countUnreadNotifications(channelId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.channelId, channelId), eq(notifications.isRead, false)));

  return row?.count ?? 0;
}

// 알림 탭(전체/위험 알림/반복 작성자/공지사항)별 배지 숫자용 — 타입별 전체 건수.
export async function countNotificationsByType(channelId: string) {
  const rows = await db
    .select({ type: notifications.type, count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(eq(notifications.channelId, channelId))
    .groupBy(notifications.type);

  return Object.fromEntries(rows.map((row) => [row.type, row.count])) as Partial<
    Record<NotificationType, number>
  >;
}

export async function getNotifications(
  channelId: string,
  options?: { limit?: number; types?: NotificationType[] },
) {
  const conditions = [eq(notifications.channelId, channelId)];
  if (options?.types) {
    conditions.push(inArray(notifications.type, options.types));
  }

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
      reason: comments.reason,
      riskLevel: comments.riskLevel,
      category: comments.category,
      authorDisplayName: comments.authorDisplayName,
      videoId: comments.videoId,
      videoTitle: comments.videoTitle,
    })
    .from(notifications)
    .leftJoin(comments, eq(notifications.commentId, comments.id))
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt));

  return options?.limit ? query.limit(options.limit) : query;
}

// 관리자 유저 상세 화면 전용 — 채널 구분 없이 그 유저의 최근 알림 전체
export async function getNotificationsByUserId(userId: string, limit: number) {
  return db
    .select({
      id: notifications.id,
      type: notifications.type,
      isRead: notifications.isRead,
      createdAt: notifications.createdAt,
      title: notifications.title,
      message: notifications.message,
      href: notifications.href,
    })
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function markNotificationRead(id: string, channelId: string) {
  const updated = await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, id), eq(notifications.channelId, channelId)))
    .returning({ id: notifications.id });

  return updated.length > 0;
}

export async function markAllNotificationsRead(channelId: string) {
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.channelId, channelId), eq(notifications.isRead, false)));
}

function formatDate(date: Date): string {
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

// 결제 알림은 채널이 아니라 계정(userId) 단위 — subscriptions가 userId 기준이라
// channelId 개념이 없다. 프론트에서 channelId 없이도 /mypage/subscription으로
// 보여줄 수 있게 href를 절대경로로 고정한다.
export async function notifyPaymentFailed(userId: string, retryAt: Date) {
  await db.insert(notifications).values({
    userId,
    type: "payment_failed",
    title: "결제에 실패했어요",
    message: `카드 결제가 실패했습니다. ${formatDate(retryAt)}에 다시 시도됩니다. 카드 정보를 확인해 주세요.`,
    href: "/mypage/subscription",
  });
}

export async function notifyPaymentDowngraded(userId: string) {
  await db.insert(notifications).values({
    userId,
    type: "payment_downgraded",
    title: "무료 플랜으로 전환되었습니다",
    message: "재시도 결제도 실패해 무료 플랜으로 전환됐어요. 다시 구독하려면 결제 정보를 등록해 주세요.",
    href: "/mypage/subscription",
  });
}

// payment_* 와 동일하게 채널이 아니라 계정(userId) 단위 알림. refId에 "YYYY-MM"을
// 넣어 같은 달에는 한 번만 알린다.
async function hasEverNotifiedAccountOfType(
  userId: string,
  type: NotificationType,
  refId: string,
) {
  const [row] = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        isNull(notifications.channelId),
        eq(notifications.type, type),
        eq(notifications.refId, refId),
      ),
    )
    .limit(1);

  return Boolean(row);
}

// 이번 달 계정 전체(연동 채널 합산) 댓글 분석 한도에 도달했을 때 — 월 1회만 알린다.
// 분석 자체는 한도 도달 즉시 멈추고(analyzePendingComments), 다음 달이 되면
// countAnalyzedCommentsThisMonthByUserId가 자연히 0부터 다시 세어져 재개된다.
export async function maybeNotifyAnalysisQuotaReached(userId: string) {
  const now = new Date();
  const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

  if (await hasEverNotifiedAccountOfType(userId, "analysis_quota_reached", monthKey)) {
    return;
  }

  await db.insert(notifications).values({
    userId,
    type: "analysis_quota_reached",
    title: "이번 달 댓글 분석 한도에 도달했어요",
    message:
      "현재 플랜의 월 분석 한도를 다 썼습니다. 분석되지 않은 댓글은 다음 달이 되면 이어서 분석됩니다. 더 많은 분석이 필요하면 플랜을 업그레이드해 주세요.",
    href: "/mypage/subscription",
    refId: monthKey,
  });
}

// 관리자 시스템 모니터링 전용 — 이번 달 월 분석 한도에 도달한 유저 목록.
// maybeNotifyAnalysisQuotaReached가 이미 남겨둔 알림을 그대로 조회한다.
export async function getAnalysisQuotaReachedUsersThisMonth() {
  const now = new Date();
  const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

  return db
    .select({
      userId: notifications.userId,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .where(
      and(
        eq(notifications.type, "analysis_quota_reached"),
        eq(notifications.refId, monthKey),
      ),
    )
    .orderBy(desc(notifications.createdAt));
}

// 결제 알림(channelId가 NULL인 계정 단위 알림)만 조회 — /mypage/subscription 전용
export async function getAccountNotifications(userId: string) {
  return db
    .select({
      id: notifications.id,
      type: notifications.type,
      isRead: notifications.isRead,
      createdAt: notifications.createdAt,
      title: notifications.title,
      message: notifications.message,
    })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.channelId)))
    .orderBy(desc(notifications.createdAt));
}

// 계정 삭제 시 함께 정리한다
export async function deleteNotificationsByUserId(userId: string) {
  await db.delete(notifications).where(eq(notifications.userId, userId));
  await db
    .delete(authorSubscriptions)
    .where(eq(authorSubscriptions.userId, userId));
}
