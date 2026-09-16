import "server-only";

import {
  and,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lt,
  notInArray,
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

// 반복 위험 작성자 알림의 유형 breakdown용 — 해당 작성자의 악성 댓글을
// 카테고리별로 집계한다. isMalicious=true인 댓글만 대상이라 category는
// 항상 "해당없음"이 아닌 실제 유형(협박/인신공격 등)이다.
export async function getCategoryBreakdownByAuthor(
  channelId: string,
  authorChannelId: string,
) {
  const rows = await db
    .select({
      category: comments.category,
      count: sql<number>`count(*)::int`,
    })
    .from(comments)
    .where(
      and(
        eq(comments.channelId, channelId),
        eq(comments.authorChannelId, authorChannelId),
        eq(comments.isMalicious, true),
      ),
    )
    .groupBy(comments.category)
    .orderBy(desc(sql`count(*)`));

  return rows.filter(
    (row): row is { category: string; count: number } => row.category !== null,
  );
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

// 주간 요약 "위험 유형별 비율"용 — 기간 내 악성 댓글의 카테고리별 집계(건수 내림차순)
export async function getCategoryBreakdownInRange(
  channelId: string,
  from: Date,
  to: Date,
) {
  const rows = await db
    .select({
      category: comments.category,
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
    .groupBy(comments.category)
    .orderBy(desc(sql`count(*)`));

  return rows.filter(
    (row): row is { category: string; count: number } => row.category !== null,
  );
}

// 주간 요약 "쇼츠 vs 동영상 비교" 위젯용 — 기간 내 영상 유형별 전체 댓글 수와
// 그중 악성 댓글 수 (위험 비율 계산용). videoType이 null인 레거시/비유튜브
// 데이터는 비교 대상이 아니라 제외한다
export async function getVideoTypeBreakdownInRange(
  channelId: string,
  from: Date,
  to: Date,
) {
  const rows = await db
    .select({
      videoType: comments.videoType,
      total: sql<number>`count(*)::int`,
      malicious: sql<number>`count(*) filter (where ${comments.isMalicious})::int`,
    })
    .from(comments)
    .where(
      and(
        eq(comments.channelId, channelId),
        isNotNull(comments.isMalicious),
        gte(comments.createdAt, from),
        lt(comments.createdAt, to),
      ),
    )
    .groupBy(comments.videoType);

  return rows.filter(
    (row): row is { videoType: "video" | "shorts"; total: number; malicious: number } =>
      row.videoType !== null,
  );
}

// SQL date_trunc('day', ...)는 DB 세션 타임존(UTC)으로 하루를 나누는데, 서버는
// 한국시간(Asia/Seoul)으로 동작한다. 자정 근처(0~9시 KST)에 작성된 댓글은
// UTC 기준으론 아직 전날이라 엉뚱한 날짜에 묶이므로, 서버 로컬 시각 기준으로
// 직접 묶는다 — daily-trend-card.tsx의 toDayKey와 동일한 기준이라야 맞는다.
function groupByLocalDay(dates: Date[]): { day: Date; count: number }[] {
  const counts = new Map<string, { day: Date; count: number }>();
  for (const date of dates) {
    const localMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const key = localMidnight.getTime().toString();
    const existing = counts.get(key);
    if (existing) existing.count += 1;
    else counts.set(key, { day: localMidnight, count: 1 });
  }
  return Array.from(counts.values()).sort((a, b) => a.day.getTime() - b.day.getTime());
}

// 대시보드 추이 스파크라인용 — 기간 내 일별 악성 댓글 건수 (일자 오름차순)
export async function getDailyMaliciousCounts(
  channelId: string,
  from: Date,
  to: Date,
) {
  const rows = await db
    .select({ createdAt: comments.createdAt })
    .from(comments)
    .where(
      and(
        eq(comments.channelId, channelId),
        eq(comments.isMalicious, true),
        gte(comments.createdAt, from),
        lt(comments.createdAt, to),
      ),
    );

  return groupByLocalDay(rows.map((row) => row.createdAt));
}

// 대시보드 "최근 7일 추이" 차트의 "전체 댓글" 시리즈용 — 기간 내 일별 분석 완료된
// 전체 댓글 건수(악성 여부 무관)
export async function getDailyAnalyzedCounts(
  channelId: string,
  from: Date,
  to: Date,
) {
  const rows = await db
    .select({ createdAt: comments.createdAt })
    .from(comments)
    .where(
      and(
        eq(comments.channelId, channelId),
        isNotNull(comments.isMalicious),
        gte(comments.createdAt, from),
        lt(comments.createdAt, to),
      ),
    );

  return groupByLocalDay(rows.map((row) => row.createdAt));
}

// 대시보드 "요주의 작성자" 위젯 · 주간 요약 "반복 위험 작성자 TOP" 위젯용 —
// 악성 댓글 수 기준 상위 작성자. from을 안 넘기면 누적 전체 기간, 넘기면 해당
// 시점 이후로 범위를 좁힌다. to까지 넘기면 [from, to) 사이로 한정한다(주간 요약처럼
// 특정 한 주만 봐야 할 때 씀).
export async function getTopAuthorsByMaliciousCount(
  channelId: string,
  limit: number,
  from?: Date,
  to?: Date,
) {
  const conditions = [
    eq(comments.channelId, channelId),
    eq(comments.isMalicious, true),
  ];
  if (from) conditions.push(gte(comments.createdAt, from));
  if (to) conditions.push(lt(comments.createdAt, to));

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

// 작성자 검색 페이지용 — query가 있으면 이름으로 필터링하고, 없으면(초기 화면)
// 악성 댓글이 많은 순으로 기본 목록을 보여준다. "총 댓글"(악성 여부 무관)도
// 같이 보여줘야 해서 WHERE는 악성 여부로 거르지 않고, 대신 HAVING으로
// 악성 댓글이 1건 이상인 작성자만 남긴다
export async function searchAuthors(
  channelId: string,
  query: string,
  limit: number,
) {
  const conditions = [eq(comments.channelId, channelId)];
  if (query) {
    conditions.push(ilike(comments.authorDisplayName, `%${query}%`));
  }
  const maliciousCount = sql`count(*) filter (where ${comments.isMalicious})`;

  const rows = await db
    .select({
      authorChannelId: comments.authorChannelId,
      authorDisplayName: sql<string | null>`max(${comments.authorDisplayName})`,
      count: sql<number>`${maliciousCount}::int`,
      totalCount: sql<number>`count(*)::int`,
      // postgres.js는 집계 함수(max) 결과의 timestamptz를 Date가 아닌 문자열로
      // 반환하므로, 일반 컬럼 select와 달리 여기서 직접 Date로 변환해줘야 한다
      lastCommentAt: sql<string>`max(${comments.createdAt}) filter (where ${comments.isMalicious})`,
    })
    .from(comments)
    .where(and(...conditions))
    .groupBy(comments.authorChannelId)
    .having(sql`${maliciousCount} >= 1`)
    .orderBy(sql`${maliciousCount} desc`)
    .limit(limit);

  return rows.map((row) => ({
    ...row,
    lastCommentAt: new Date(row.lastCommentAt),
  }));
}

// 작성자 검색 페이지 상단 통계 카드 "반복 작성자 수" — 악성 댓글을 2건 이상
// 남긴 작성자(distinct) 수
export async function countRepeatAuthors(channelId: string) {
  const rows = await db
    .select({ authorChannelId: comments.authorChannelId })
    .from(comments)
    .where(and(eq(comments.channelId, channelId), eq(comments.isMalicious, true)))
    .groupBy(comments.authorChannelId)
    .having(sql`count(*) >= 2`);

  return rows.length;
}

// 작성자 검색 페이지 상단 통계 카드 "총 악성 댓글 작성자 수" — 악성 댓글이
// 1건 이상 있는 작성자(distinct) 수
export async function countTotalMaliciousAuthors(channelId: string) {
  const [row] = await db
    .select({
      count: sql<number>`count(distinct ${comments.authorChannelId})::int`,
    })
    .from(comments)
    .where(and(eq(comments.channelId, channelId), eq(comments.isMalicious, true)));

  return row?.count ?? 0;
}

// 영상별 보기 페이지용 — query가 있으면 제목으로 필터링하고, 없으면(초기 화면)
// 악성 댓글이 많은 순으로 기본 목록을 보여준다
export async function searchVideos(
  channelId: string,
  query: string,
  limit: number,
  offset: number,
  videoType?: "video" | "shorts",
  sort: "latest" | "malicious" = "latest",
) {
  const conditions = [
    eq(comments.channelId, channelId),
    eq(comments.isMalicious, true),
  ];
  if (query) {
    conditions.push(ilike(comments.videoTitle, `%${query}%`));
  }
  if (videoType) {
    conditions.push(eq(comments.videoType, videoType));
  }

  const orderBy =
    sort === "malicious"
      ? sql`count(*) desc`
      : sql`max(${comments.createdAt}) desc`;

  const rows = await db
    .select({
      videoId: comments.videoId,
      videoTitle: sql<string | null>`max(${comments.videoTitle})`,
      videoType: sql<string | null>`max(${comments.videoType})`,
      count: sql<number>`count(*)::int`,
      // postgres.js는 집계 함수(max) 결과의 timestamptz를 Date가 아닌 문자열로
      // 반환하므로, 일반 컬럼 select와 달리 여기서 직접 Date로 변환해줘야 한다
      lastCommentAt: sql<string>`max(${comments.createdAt})`,
    })
    .from(comments)
    .where(and(...conditions))
    .groupBy(comments.videoId)
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);

  return rows.map((row) => ({
    ...row,
    lastCommentAt: new Date(row.lastCommentAt),
  }));
}

// 영상별 보기 페이지 페이지네이션용 — searchVideos와 같은 필터 조건에
// 일치하는 영상(distinct videoId) 총 개수
export async function countVideos(
  channelId: string,
  query: string,
  videoType?: "video" | "shorts",
) {
  const conditions = [
    eq(comments.channelId, channelId),
    eq(comments.isMalicious, true),
  ];
  if (query) {
    conditions.push(ilike(comments.videoTitle, `%${query}%`));
  }
  if (videoType) {
    conditions.push(eq(comments.videoType, videoType));
  }

  const [row] = await db
    .select({ count: sql<number>`count(distinct ${comments.videoId})::int` })
    .from(comments)
    .where(and(...conditions));

  return row?.count ?? 0;
}

// 대시보드 "최근 악성 댓글 몰린 영상" 위젯용 — 기간 내 영상별 악성 댓글 수 상위
export async function getTopVideosByMaliciousCount(
  channelId: string,
  from: Date,
  to: Date,
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
        lt(comments.createdAt, to),
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

// 주간 요약 KPI "총 댓글" — 기간 내 분석 완료된 전체 댓글 수(악성 여부 무관)
export async function countAnalyzedCommentsInRange(
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
        isNotNull(comments.isMalicious),
        gte(comments.createdAt, from),
        lt(comments.createdAt, to),
      ),
    );

  return row?.count ?? 0;
}

// 대시보드 KPI 타일 "검토 필요" 이전 7일 대비 계산용 — 기간 내 검토 필요 상태인 악성 댓글 수
export async function countNeedsReviewInRange(
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
        eq(comments.status, "needs_review"),
        gte(comments.createdAt, from),
        lt(comments.createdAt, to),
      ),
    );

  return row?.count ?? 0;
}

export type CommentRiskLevel = "high" | "medium" | "low";

export type CommentFilters = {
  riskLevel?: CommentRiskLevel;
  category?: string;
  status?: "confirmed" | "needs_review";
  platform?: "youtube" | "instagram";
  videoId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: "newest" | "risk";
};

function buildFlaggedConditions(channelId: string, filters: CommentFilters) {
  const conditions = [
    eq(comments.channelId, channelId),
    eq(comments.isMalicious, true),
    // 사람이 "정상 댓글로 분류"하면 이 목록에서 완전히 빠진다 — 정상 판정된
    // 댓글은 작성자 상세 페이지의 "전체 댓글 보기"에서만 계속 볼 수 있다
    notInArray(comments.status, ["reported_false", "whitelisted"]),
  ];

  if (filters.riskLevel) conditions.push(eq(comments.riskLevel, filters.riskLevel));
  if (filters.category) conditions.push(eq(comments.category, filters.category));
  if (filters.platform) conditions.push(eq(comments.platform, filters.platform));
  if (filters.status) conditions.push(eq(comments.status, filters.status));
  if (filters.videoId) conditions.push(eq(comments.videoId, filters.videoId));
  if (filters.search) {
    conditions.push(ilike(comments.text, `%${filters.search}%`));
  }
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

// 댓글 목록 "전체 선택"용 — 필터에 일치하는 댓글을 페이지 구분 없이 한 번에
// 벌크 처리(상태 변경·증거 보관)할 수 있게 id만 가져온다. 벌크 API 자체도
// 같은 상한(MAX_BULK_SELECTION)으로 요청을 거부하므로 여기서도 동일하게 자른다.
export const MAX_BULK_SELECTION = 1000;

export async function getFlaggedCommentIds(
  channelId: string,
  filters: CommentFilters,
) {
  const conditions = buildFlaggedConditions(channelId, filters);

  const rows = await db
    .select({ id: comments.id })
    .from(comments)
    .where(and(...conditions))
    .orderBy(sql`${comments.createdAt} desc`)
    .limit(MAX_BULK_SELECTION + 1);

  return {
    ids: rows.slice(0, MAX_BULK_SELECTION).map((row) => row.id),
    truncated: rows.length > MAX_BULK_SELECTION,
  };
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
    .selectDistinct({ category: comments.category })
    .from(comments)
    .where(
      and(
        eq(comments.channelId, channelId),
        eq(comments.isMalicious, true),
        notInArray(comments.status, ["reported_false", "whitelisted"]),
      ),
    );

  const categories = Array.from(
    new Set(rows.map((r) => r.category).filter((c): c is string => c !== null)),
  );

  return { categories };
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
        notInArray(comments.status, ["reported_false", "whitelisted"]),
      ),
    )
    .orderBy(sql`${comments.createdAt} desc`);
}

// 작성자 상세 페이지 "전체 댓글 보기" 피드용 — 악성 여부와 무관하게 이
// 작성자가 남긴 모든 댓글
export async function getAllCommentsByAuthor(
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

// 증거 보관함 좌측 목록 무한스크롤 한 번에 불러오는 건수
export const ARCHIVE_PAGE_SIZE = 30;

export async function getArchivedComments(
  channelId: string,
  limit: number,
  offset: number,
) {
  return db
    .select()
    .from(comments)
    .where(and(eq(comments.channelId, channelId), eq(comments.isArchived, true)))
    .orderBy(sql`${comments.archivedAt} desc`)
    .limit(limit)
    .offset(offset);
}

// 주간 요약 KPI "증거 보관"(누적 전체) — 이 채널에서 현재 보관 중인 증거 건수
export async function countArchivedCommentsByChannelId(channelId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(comments)
    .where(and(eq(comments.channelId, channelId), eq(comments.isArchived, true)));

  return row?.count ?? 0;
}

// 주간 요약 인사이트용 — 기간 내 새로 보관된(archivedAt 기준) 증거 건수
export async function countArchivedInRange(
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
        eq(comments.isArchived, true),
        gte(comments.archivedAt, from),
        lt(comments.archivedAt, to),
      ),
    );

  return row?.count ?? 0;
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

export async function updateArchiveNote(
  commentId: string,
  channelId: string,
  note: string | null,
) {
  const updated = await db
    .update(comments)
    .set({ archiveNote: note })
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
      uncertaintyReason: analysis.uncertainty_reason,
      aiModel: MODEL,
      promptVersion: PROMPT_VERSION,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      status,
      analyzedAt: new Date(),
    })
    .where(eq(comments.id, commentId));
}
