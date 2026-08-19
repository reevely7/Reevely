import "server-only";

import { and, eq, isNull, sql, type SQL } from "drizzle-orm";

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
  youtubeCommentId: string;
  authorChannelId: string;
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

export type CommentFilters = {
  riskLevel?: "high" | "medium" | "low";
  category?: string;
  status?: "confirmed" | "needs_review" | "reported_false" | "whitelisted";
  videoId?: string;
  sort?: "newest" | "risk";
};

export async function getFlaggedComments(
  userId: string,
  filters: CommentFilters,
) {
  const conditions = [
    eq(comments.userId, userId),
    eq(comments.isMalicious, true),
  ];

  if (filters.riskLevel) conditions.push(eq(comments.riskLevel, filters.riskLevel));
  if (filters.category) conditions.push(eq(comments.category, filters.category));
  if (filters.status) conditions.push(eq(comments.status, filters.status));
  if (filters.videoId) conditions.push(eq(comments.videoId, filters.videoId));

  const orderBy: SQL =
    filters.sort === "risk"
      ? sql`case ${comments.riskLevel} when 'high' then 0 when 'medium' then 1 else 2 end asc, ${comments.createdAt} desc`
      : sql`${comments.createdAt} desc`;

  return db
    .select()
    .from(comments)
    .where(and(...conditions))
    .orderBy(orderBy);
}

export async function getFlaggedFilterOptions(userId: string) {
  const rows = await db
    .selectDistinct({
      category: comments.category,
      videoId: comments.videoId,
    })
    .from(comments)
    .where(and(eq(comments.userId, userId), eq(comments.isMalicious, true)));

  const categories = Array.from(
    new Set(rows.map((r) => r.category).filter((c): c is string => c !== null)),
  );
  const videoIds = Array.from(new Set(rows.map((r) => r.videoId)));

  return { categories, videoIds };
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
