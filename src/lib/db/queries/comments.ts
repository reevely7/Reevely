import "server-only";

import {
  and,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lt,
  sql,
  type SQL,
} from "drizzle-orm";

import {
  MODEL,
  PROMPT_VERSION,
  type CommentAnalysis,
  type TokenUsage,
} from "@/lib/ai/analyze-comment";
import { db } from "@/lib/db";
import { comments } from "@/lib/db/schema";

type NewCommentInput = {
  userId: string;
  channelId: string;
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
      target: [comments.channelId, comments.youtubeCommentId],
    })
    .returning({ id: comments.id });

  return inserted.length;
}

// 이미 저장된 댓글에서 영상별 videoType을 재사용하기 위한 캐시 조회 — 한 번
// 쇼츠/영상으로 확정된 영상은 나중에 바뀌지 않으므로, sync마다 다시
// youtube.com을 스크래핑(detectVideoType)하지 않고 여기서 먼저 찾는다.
export async function getKnownVideoTypes(
  channelId: string,
  videoIds: string[],
): Promise<Map<string, "video" | "shorts">> {
  if (videoIds.length === 0) return new Map();

  const rows = await db
    .select({ videoId: comments.videoId, videoType: comments.videoType })
    .from(comments)
    .where(
      and(
        eq(comments.channelId, channelId),
        inArray(comments.videoId, videoIds),
        isNotNull(comments.videoType),
      ),
    );

  return new Map(
    rows
      .filter((row): row is { videoId: string; videoType: "video" | "shorts" } =>
        row.videoType !== null,
      )
      .map((row) => [row.videoId, row.videoType]),
  );
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

// 이번 달(UTC 기준 1일 0시~) 계정 전체(연동 채널 합산)에서 AI가 분석 처리한
// 댓글 수 — 플랜별 월 분석량 한도 체크에 쓴다
export async function countAnalyzedCommentsThisMonthByUserId(userId: string) {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(comments)
    .where(and(eq(comments.userId, userId), gte(comments.analyzedAt, monthStart)));

  return row?.count ?? 0;
}

// 반복 작성자 구독 제안 알림에 쓰는 누적 악성 댓글 수
export async function countMaliciousCommentsByAuthor(
  channelId: string,
  authorChannelId: string,
) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(comments)
    .where(
      and(
        eq(comments.channelId, channelId),
        eq(comments.authorChannelId, authorChannelId),
        eq(comments.isMalicious, true),
      ),
    );

  return row?.count ?? 0;
}

// 주간 다이제스트 알림에 쓰는 기간별 악성 댓글 수 (from 이상, to 미만)
export async function countMaliciousCommentsInRange(
  channelId: string,
  from: Date,
  to: Date,
) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(comments)
    .where(
      and(
        eq(comments.channelId, channelId),
        eq(comments.isMalicious, true),
        gte(comments.createdAt, from),
        lt(comments.createdAt, to),
      ),
    );

  return row?.count ?? 0;
}

// 주간 요약 페이지에 쓰는 기간별 위험도 분해 (from 이상, to 미만)
export async function getRiskBreakdownInRange(
  channelId: string,
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
        eq(comments.channelId, channelId),
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
  channelId: string,
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
        eq(comments.channelId, channelId),
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
  channelId: string,
  limit: number,
  from?: Date,
) {
  const conditions = [
    eq(comments.channelId, channelId),
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
  channelId: string,
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
        eq(comments.channelId, channelId),
        eq(comments.isMalicious, true),
        gte(comments.createdAt, from),
      ),
    )
    .groupBy(comments.videoId)
    .orderBy(sql`count(*) desc`)
    .limit(limit);
}

export async function getUnanalyzedComments(channelId: string, limit: number) {
  return db
    .select()
    .from(comments)
    .where(and(eq(comments.channelId, channelId), isNull(comments.analyzedAt)))
    .limit(limit);
}

export async function getDashboardSummary(channelId: string) {
  const rows = await db
    .select({
      riskLevel: comments.riskLevel,
      status: comments.status,
      count: sql<number>`count(*)::int`,
    })
    .from(comments)
    .where(and(eq(comments.channelId, channelId), eq(comments.isMalicious, true)))
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

// 대시보드 "악성 비율" KPI 분모 — 채널에 수집된 댓글 중 AI 분석이 끝난 전체 건수
// (악성 여부와 무관하게 isMalicious가 null이 아니면 분석 완료)
export async function countAnalyzedCommentsByChannelId(channelId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(comments)
    .where(
      and(eq(comments.channelId, channelId), isNotNull(comments.isMalicious)),
    );

  return row?.count ?? 0;
}

export type CommentRiskLevel = "high" | "medium" | "low";

export type CommentFilters = {
  riskLevel?: CommentRiskLevel;
  category?: string;
  status?: "confirmed" | "needs_review" | "reported_false" | "whitelisted";
  platform?: "youtube" | "instagram";
  videoId?: string;
  search?: string;
  author?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: "newest" | "risk";
};

function buildFlaggedConditions(channelId: string, filters: CommentFilters) {
  const conditions = [
    eq(comments.channelId, channelId),
    eq(comments.isMalicious, true),
  ];

  if (filters.riskLevel) conditions.push(eq(comments.riskLevel, filters.riskLevel));
  if (filters.category) conditions.push(eq(comments.category, filters.category));
  if (filters.platform) conditions.push(eq(comments.platform, filters.platform));
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
  channelId: string,
  filters: CommentFilters,
  page: number,
  pageSize: number,
) {
  const conditions = buildFlaggedConditions(channelId, filters);

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
  channelId: string,
  filters: CommentFilters,
) {
  const conditions = buildFlaggedConditions(channelId, filters);

  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(comments)
    .where(and(...conditions));

  return row?.count ?? 0;
}

export async function getFlaggedFilterOptions(channelId: string) {
  const rows = await db
    .selectDistinct({
      category: comments.category,
      videoId: comments.videoId,
      videoTitle: comments.videoTitle,
    })
    .from(comments)
    .where(and(eq(comments.channelId, channelId), eq(comments.isMalicious, true)));

  const categories = Array.from(
    new Set(rows.map((r) => r.category).filter((c): c is string => c !== null)),
  );
  const videos = Array.from(
    new Map(rows.map((r) => [r.videoId, r.videoTitle])).entries(),
  ).map(([videoId, videoTitle]) => ({ videoId, videoTitle }));

  return { categories, videos };
}

export async function getCommentsByAuthor(
  channelId: string,
  authorChannelId: string,
) {
  return db
    .select()
    .from(comments)
    .where(
      and(
        eq(comments.channelId, channelId),
        eq(comments.authorChannelId, authorChannelId),
        eq(comments.isMalicious, true),
      ),
    )
    .orderBy(sql`${comments.createdAt} desc`);
}

export async function getReviewQueue(channelId: string) {
  return db
    .select()
    .from(comments)
    .where(
      and(eq(comments.channelId, channelId), eq(comments.status, "needs_review")),
    )
    .orderBy(sql`${comments.confidence} asc nulls last`);
}

export async function countReviewQueue(channelId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(comments)
    .where(
      and(eq(comments.channelId, channelId), eq(comments.status, "needs_review")),
    );

  return row?.count ?? 0;
}

type CommentStatus = "confirmed" | "needs_review" | "reported_false" | "whitelisted";

// 해당 채널 소유 댓글만 수정 가능하도록 channelId까지 조건에 걸어 확인한다
export async function updateCommentStatus(
  commentId: string,
  channelId: string,
  status: CommentStatus,
) {
  const updated = await db
    .update(comments)
    .set({ status, isHumanReviewed: true })
    .where(and(eq(comments.id, commentId), eq(comments.channelId, channelId)))
    .returning({ id: comments.id });

  return updated.length > 0;
}

export async function updateCommentStatusBulk(
  commentIds: string[],
  channelId: string,
  status: CommentStatus,
) {
  if (commentIds.length === 0) return 0;

  const updated = await db
    .update(comments)
    .set({ status, isHumanReviewed: true })
    .where(
      and(inArray(comments.id, commentIds), eq(comments.channelId, channelId)),
    )
    .returning({ id: comments.id });

  return updated.length;
}

// 계정 전체(연동 채널 합산) 증거 보관함 저장 건수 — 플랜별 한도 체크에 쓴다
export async function countArchivedCommentsByUserId(userId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(comments)
    .where(and(eq(comments.userId, userId), eq(comments.isArchived, true)));

  return row?.count ?? 0;
}

// 관리자 콘텐츠/신고 관리 화면 전용 — 채널 구분 없이 오탐 신고된 댓글 전체
// (재학습 데이터 후보/프롬프트 개선 패턴 파악용)
export async function getReportedFalseComments(limit: number, offset: number) {
  return db
    .select()
    .from(comments)
    .where(eq(comments.status, "reported_false"))
    .orderBy(sql`${comments.analyzedAt} desc nulls last`)
    .limit(limit)
    .offset(offset);
}

export async function countReportedFalseComments() {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(comments)
    .where(eq(comments.status, "reported_false"));

  return row?.count ?? 0;
}

// 관리자 콘텐츠/신고 관리 화면 전용 — 유저별 증거 보관함 사용 건수 전체
export async function getArchivedCommentCountsByUser() {
  return db
    .select({ userId: comments.userId, count: sql<number>`count(*)::int` })
    .from(comments)
    .where(eq(comments.isArchived, true))
    .groupBy(comments.userId);
}

export async function getArchivedComments(channelId: string) {
  return db
    .select()
    .from(comments)
    .where(and(eq(comments.channelId, channelId), eq(comments.isArchived, true)))
    .orderBy(sql`${comments.archivedAt} desc`);
}

// 해당 채널 소유 댓글만 보관 가능하도록 channelId까지 조건에 걸어 확인한다.
// 한도 체크(계정 전체 합산)는 호출부(API 라우트)에서 미리 하고 이 함수는
// 실제 저장만 한다.
export async function archiveComment(commentId: string, channelId: string) {
  const updated = await db
    .update(comments)
    .set({ isArchived: true, archivedAt: new Date() })
    .where(and(eq(comments.id, commentId), eq(comments.channelId, channelId)))
    .returning({ id: comments.id });

  return updated.length > 0;
}

export async function unarchiveComment(commentId: string, channelId: string) {
  const updated = await db
    .update(comments)
    .set({ isArchived: false, archivedAt: null })
    .where(and(eq(comments.id, commentId), eq(comments.channelId, channelId)))
    .returning({ id: comments.id });

  return updated.length > 0;
}

export async function archiveCommentsBulk(
  commentIds: string[],
  channelId: string,
) {
  if (commentIds.length === 0) return 0;

  const updated = await db
    .update(comments)
    .set({ isArchived: true, archivedAt: new Date() })
    .where(
      and(inArray(comments.id, commentIds), eq(comments.channelId, channelId)),
    )
    .returning({ id: comments.id });

  return updated.length;
}

export async function deleteCommentsByUserId(userId: string) {
  await db.delete(comments).where(eq(comments.userId, userId));
}

// 데이터 보관 기간 정리 cron 전용 — cutoff보다 오래된 댓글을 계정 전체(연동
// 채널 합산)에서 지운다. 증거 보관함에 저장된 것(isArchived=true)은 보관
// 기간과 무관하게 제외한다.
export async function deleteExpiredComments(userId: string, cutoff: Date) {
  const deleted = await db
    .delete(comments)
    .where(
      and(
        eq(comments.userId, userId),
        eq(comments.isArchived, false),
        lt(comments.createdAt, cutoff),
      ),
    )
    .returning({ id: comments.id });

  return deleted.length;
}

export async function saveAnalysisResult(
  commentId: string,
  analysis: CommentAnalysis,
  usage: TokenUsage,
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
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      status,
      analyzedAt: new Date(),
    })
    .where(eq(comments.id, commentId));
}
