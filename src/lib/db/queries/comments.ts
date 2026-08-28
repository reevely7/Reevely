import "server-only";

import { and, eq, gte, ilike, isNull, lt, sql, type SQL } from "drizzle-orm";

import {
  MODEL,
  PROMPT_VERSION,
  type CommentAnalysis,
} from "@/lib/ai/analyze-comment";
import { db } from "@/lib/db";
import { comments } from "@/lib/db/schema";

type NewCommentInput = {
  userId: string;
  videoId: string;
  videoTitle: string | null;
  videoType: "video" | "shorts" | null;
  youtubeCommentId: string;
  authorChannelId: string;
  authorDisplayName: string | null;
  text: string;
  createdAt: Date;
};

export async function insertNewComments(rows: NewCommentInput[]) {
  if (rows.length === 0) return 0;

  const inserted = await db
    .insert(comments)
    .values(rows)
    .onConflictDoNothing({
      target: [comments.platform, comments.youtubeCommentId],
    })
    .returning({ id: comments.id });

  return inserted.length;
}

export async function countCommentsByUserId(userId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(comments)
    .where(eq(comments.userId, userId));

  return row?.count ?? 0;
}

export async function countUnanalyzedCommentsByUserId(userId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(comments)
    .where(and(eq(comments.userId, userId), isNull(comments.analyzedAt)));

  return row?.count ?? 0;
}

// 반복 작성자 구독 제안 알림에 쓰는 누적 악성 댓글 수
export async function countMaliciousCommentsByAuthor(
  userId: string,
  authorChannelId: string,
) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(comments)
    .where(
      and(
        eq(comments.userId, userId),
        eq(comments.authorChannelId, authorChannelId),
        eq(comments.isMalicious, true),
      ),
    );

  return row?.count ?? 0;
}

// 주간 다이제스트 알림에 쓰는 기간별 악성 댓글 수 (from 이상, to 미만)
export async function countMaliciousCommentsInRange(
  userId: string,
  from: Date,
  to: Date,
) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(comments)
    .where(
      and(
        eq(comments.userId, userId),
        eq(comments.isMalicious, true),
        gte(comments.createdAt, from),
        lt(comments.createdAt, to),
      ),
    );

  return row?.count ?? 0;
}

// 주간 요약 페이지에 쓰는 기간별 위험도 분해 (from 이상, to 미만)
export async function getRiskBreakdownInRange(
  userId: string,
  from: Date,
  to: Date,
) {
  const rows = await db
    .select({
      riskLevel: comments.riskLevel,
      count: sql<number>`count(*)::int`,
    })
    .from(comments)
    .where(
      and(
        eq(comments.userId, userId),
        eq(comments.isMalicious, true),
        gte(comments.createdAt, from),
        lt(comments.createdAt, to),
      ),
    )
    .groupBy(comments.riskLevel);

  const breakdown = { high: 0, medium: 0, low: 0 };
  for (const row of rows) {
    if (row.riskLevel === "high") breakdown.high = row.count;
    if (row.riskLevel === "medium") breakdown.medium = row.count;
    if (row.riskLevel === "low") breakdown.low = row.count;
  }
  return breakdown;
}

// 대시보드 추이 스파크라인용 — 기간 내 일별 악성 댓글 건수 (일자 오름차순)
export async function getDailyMaliciousCounts(
  userId: string,
  from: Date,
  to: Date,
) {
  const dayExpr = sql<string>`date_trunc('day', ${comments.createdAt})`;

  return db
    .select({
      day: dayExpr,
      count: sql<number>`count(*)::int`,
    })
    .from(comments)
    .where(
      and(
        eq(comments.userId, userId),
        eq(comments.isMalicious, true),
        gte(comments.createdAt, from),
        lt(comments.createdAt, to),
      ),
    )
    .groupBy(dayExpr)
    .orderBy(dayExpr);
}

// 대시보드 "요주의 작성자" 위젯용 — 악성 댓글 수 기준 상위 작성자.
// from을 안 넘기면 누적 전체 기간, 넘기면 해당 시점 이후로 범위를 좁힌다.
export async function getTopAuthorsByMaliciousCount(
  userId: string,
  limit: number,
  from?: Date,
) {
  const conditions = [
    eq(comments.userId, userId),
    eq(comments.isMalicious, true),
  ];
  if (from) conditions.push(gte(comments.createdAt, from));

  return db
    .select({
      authorChannelId: comments.authorChannelId,
      authorDisplayName: sql<string | null>`max(${comments.authorDisplayName})`,
      count: sql<number>`count(*)::int`,
    })
    .from(comments)
    .where(and(...conditions))
    .groupBy(comments.authorChannelId)
    .orderBy(sql`count(*) desc`)
    .limit(limit);
}

// 대시보드 "최근 악성 댓글 몰린 영상" 위젯용 — 기간 내 영상별 악성 댓글 수 상위
export async function getTopVideosByMaliciousCount(
  userId: string,
  from: Date,
  limit: number,
) {
  return db
    .select({
      videoId: comments.videoId,
      videoTitle: sql<string | null>`max(${comments.videoTitle})`,
      videoType: sql<string | null>`max(${comments.videoType})`,
      count: sql<number>`count(*)::int`,
    })
    .from(comments)
    .where(
      and(
        eq(comments.userId, userId),
        eq(comments.isMalicious, true),
        gte(comments.createdAt, from),
      ),
    )
    .groupBy(comments.videoId)
    .orderBy(sql`count(*) desc`)
    .limit(limit);
}

export async function getUnanalyzedComments(userId: string, limit: number) {
  return db
    .select()
    .from(comments)
    .where(and(eq(comments.userId, userId), isNull(comments.analyzedAt)))
    .limit(limit);
}

export async function getDashboardSummary(userId: string) {
  const rows = await db
    .select({
      riskLevel: comments.riskLevel,
      status: comments.status,
      count: sql<number>`count(*)::int`,
    })
    .from(comments)
    .where(and(eq(comments.userId, userId), eq(comments.isMalicious, true)))
    .groupBy(comments.riskLevel, comments.status);

  const summary = { total: 0, high: 0, medium: 0, low: 0, needsReview: 0 };
  for (const row of rows) {
    summary.total += row.count;
    if (row.riskLevel === "high") summary.high += row.count;
    if (row.riskLevel === "medium") summary.medium += row.count;
    if (row.riskLevel === "low") summary.low += row.count;
    if (row.status === "needs_review") summary.needsReview += row.count;
  }
  return summary;
}

export type CommentRiskLevel = "high" | "medium" | "low";

export type CommentFilters = {
  riskLevel?: CommentRiskLevel;
  category?: string;
  status?: "confirmed" | "needs_review" | "reported_false" | "whitelisted";
  videoId?: string;
  search?: string;
  author?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: "newest" | "risk";
};

function buildFlaggedConditions(userId: string, filters: CommentFilters) {
  const conditions = [
    eq(comments.userId, userId),
    eq(comments.isMalicious, true),
  ];

  if (filters.riskLevel) conditions.push(eq(comments.riskLevel, filters.riskLevel));
  if (filters.category) conditions.push(eq(comments.category, filters.category));
  if (filters.status) conditions.push(eq(comments.status, filters.status));
  if (filters.videoId) conditions.push(eq(comments.videoId, filters.videoId));
  if (filters.search) conditions.push(ilike(comments.text, `%${filters.search}%`));
  if (filters.author)
    conditions.push(ilike(comments.authorDisplayName, `%${filters.author}%`));
  // dateFrom/dateTo는 "YYYY-MM-DD" 문자열. from은 그 날 00시 이상, to는 다음 날
  // 00시 미만으로 잡아 선택한 날짜 하루 전체가 포함되게 한다.
  if (filters.dateFrom)
    conditions.push(gte(comments.createdAt, new Date(`${filters.dateFrom}T00:00:00`)));
  if (filters.dateTo) {
    const to = new Date(`${filters.dateTo}T00:00:00`);
    to.setDate(to.getDate() + 1);
    conditions.push(lt(comments.createdAt, to));
  }

  return conditions;
}

export async function getFlaggedComments(
  userId: string,
  filters: CommentFilters,
  page: number,
  pageSize: number,
) {
  const conditions = buildFlaggedConditions(userId, filters);

  const orderBy: SQL =
    filters.sort === "risk"
      ? sql`case ${comments.riskLevel} when 'high' then 0 when 'medium' then 1 else 2 end asc, ${comments.createdAt} desc`
      : sql`${comments.createdAt} desc`;

  return db
    .select()
    .from(comments)
    .where(and(...conditions))
    .orderBy(orderBy)
    .limit(pageSize)
    .offset((page - 1) * pageSize);
}

export async function countFlaggedComments(
  userId: string,
  filters: CommentFilters,
) {
  const conditions = buildFlaggedConditions(userId, filters);

  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(comments)
    .where(and(...conditions));

  return row?.count ?? 0;
}

export async function getFlaggedFilterOptions(userId: string) {
  const rows = await db
    .selectDistinct({
      category: comments.category,
      videoId: comments.videoId,
      videoTitle: comments.videoTitle,
    })
    .from(comments)
    .where(and(eq(comments.userId, userId), eq(comments.isMalicious, true)));

  const categories = Array.from(
    new Set(rows.map((r) => r.category).filter((c): c is string => c !== null)),
  );
  const videos = Array.from(
    new Map(rows.map((r) => [r.videoId, r.videoTitle])).entries(),
  ).map(([videoId, videoTitle]) => ({ videoId, videoTitle }));

  return { categories, videos };
}

export async function getCommentsByAuthor(
  userId: string,
  authorChannelId: string,
) {
  return db
    .select()
    .from(comments)
    .where(
      and(
        eq(comments.userId, userId),
        eq(comments.authorChannelId, authorChannelId),
        eq(comments.isMalicious, true),
      ),
    )
    .orderBy(sql`${comments.createdAt} desc`);
}

export async function getReviewQueue(userId: string) {
  return db
    .select()
    .from(comments)
    .where(
      and(eq(comments.userId, userId), eq(comments.status, "needs_review")),
    )
    .orderBy(sql`${comments.confidence} asc nulls last`);
}

export async function countReviewQueue(userId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(comments)
    .where(
      and(eq(comments.userId, userId), eq(comments.status, "needs_review")),
    );

  return row?.count ?? 0;
}

type CommentStatus = "confirmed" | "needs_review" | "reported_false" | "whitelisted";

// 본인 댓글만 수정 가능하도록 userId까지 조건에 걸어 확인한다
export async function updateCommentStatus(
  commentId: string,
  userId: string,
  status: CommentStatus,
) {
  const updated = await db
    .update(comments)
    .set({ status, isHumanReviewed: true })
    .where(and(eq(comments.id, commentId), eq(comments.userId, userId)))
    .returning({ id: comments.id });

  return updated.length > 0;
}

export async function deleteCommentsByUserId(userId: string) {
  await db.delete(comments).where(eq(comments.userId, userId));
}

export async function saveAnalysisResult(
  commentId: string,
  analysis: CommentAnalysis,
) {
  // is_malicious=false → whitelisted(AI가 정상으로 판단, 검토 큐에 안 쌓임)
  // is_malicious=true && confidence>=0.7 → confirmed (자동 확정)
  // is_malicious=true && confidence<0.7 → needs_review (오탐 관리 원칙, 사람이 확인)
  const status = !analysis.is_malicious
    ? ("whitelisted" as const)
    : analysis.confidence >= 0.7
      ? ("confirmed" as const)
      : ("needs_review" as const);

  await db
    .update(comments)
    .set({
      isMalicious: analysis.is_malicious,
      riskLevel: analysis.risk_level,
      category: analysis.category,
      confidence: analysis.confidence.toFixed(2),
      reason: analysis.reason,
      aiModel: MODEL,
      promptVersion: PROMPT_VERSION,
      status,
      analyzedAt: new Date(),
    })
    .where(eq(comments.id, commentId));
}
