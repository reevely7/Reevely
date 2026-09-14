import "server-only";

import { and, desc, eq, gte, isNotNull, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { comments } from "@/lib/db/schema";

// 관리자 AI 품질 대시보드 전용 — 채널/유저 스코프 없이 시스템 전체를 집계한다

export async function getQualityOverview() {
  const [row] = await db
    .select({
      totalAnalyzed: sql<number>`count(*) filter (where ${comments.analyzedAt} is not null)::int`,
      totalMalicious: sql<number>`count(*) filter (where ${comments.isMalicious} = true)::int`,
      needsReview: sql<number>`count(*) filter (where ${comments.status} = 'needs_review')::int`,
      confirmed: sql<number>`count(*) filter (where ${comments.status} = 'confirmed')::int`,
      reportedFalse: sql<number>`count(*) filter (where ${comments.status} = 'reported_false')::int`,
      // 토큰 사용량 컬럼이 생기기 전에 분석된 댓글 수 — 비용 집계에서 제외됨을
      // 화면에서 알려주기 위한 카운트
      legacyWithoutTokenData: sql<number>`count(*) filter (where ${comments.analyzedAt} is not null and ${comments.promptTokens} is null)::int`,
    })
    .from(comments);

  const reviewed = row.confirmed + row.reportedFalse;
  const falsePositiveRate = reviewed > 0 ? row.reportedFalse / reviewed : null;

  return { ...row, falsePositiveRate };
}

export async function getRiskLevelDistribution() {
  return db
    .select({
      riskLevel: comments.riskLevel,
      count: sql<number>`count(*)::int`,
    })
    .from(comments)
    .where(eq(comments.isMalicious, true))
    .groupBy(comments.riskLevel);
}

export async function getCategoryDistribution(limit = 10) {
  return db
    .select({
      category: comments.category,
      count: sql<number>`count(*)::int`,
    })
    .from(comments)
    .where(eq(comments.isMalicious, true))
    .groupBy(comments.category)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);
}

// 모델·프롬프트 버전 조합별 건수/오탐 신고율/토큰 사용량 — 모델·프롬프트를
// 바꿀 때 실측 비교하는 CLAUDE.md 원칙을 데이터로 뒷받침한다
export async function getModelPromptComparison() {
  return db
    .select({
      aiModel: comments.aiModel,
      promptVersion: comments.promptVersion,
      total: sql<number>`count(*)::int`,
      confirmed: sql<number>`count(*) filter (where ${comments.status} = 'confirmed')::int`,
      reportedFalse: sql<number>`count(*) filter (where ${comments.status} = 'reported_false')::int`,
      // sum()은 postgres에서 bigint를 리턴하는데, pg 드라이버가 bigint를 JS
      // number가 아니라 string으로 반환해서 그대로 쓰면 "+" 연산이 문자열
      // 이어붙이기가 된다 — ::int로 캐스트해서 진짜 number로 받는다. 토큰
      // 합계가 int4 범위(21억)를 넘을 규모가 되기 전까지는 안전하다.
      promptTokensSum: sql<number>`coalesce(sum(${comments.promptTokens}), 0)::int`,
      completionTokensSum: sql<number>`coalesce(sum(${comments.completionTokens}), 0)::int`,
    })
    .from(comments)
    .where(isNotNull(comments.analyzedAt))
    .groupBy(comments.aiModel, comments.promptVersion)
    .orderBy(desc(sql`count(*)`));
}

export async function getDailyAnalysisVolume(days = 14) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  return db
    .select({
      date: sql<string>`to_char(${comments.analyzedAt}, 'YYYY-MM-DD')`,
      count: sql<number>`count(*)::int`,
      // sum()은 postgres에서 bigint를 리턴하는데, pg 드라이버가 bigint를 JS
      // number가 아니라 string으로 반환해서 그대로 쓰면 "+" 연산이 문자열
      // 이어붙이기가 된다 — ::int로 캐스트해서 진짜 number로 받는다. 토큰
      // 합계가 int4 범위(21억)를 넘을 규모가 되기 전까지는 안전하다.
      promptTokensSum: sql<number>`coalesce(sum(${comments.promptTokens}), 0)::int`,
      completionTokensSum: sql<number>`coalesce(sum(${comments.completionTokens}), 0)::int`,
    })
    .from(comments)
    .where(and(isNotNull(comments.analyzedAt), gte(comments.analyzedAt, since)))
    .groupBy(sql`to_char(${comments.analyzedAt}, 'YYYY-MM-DD')`)
    .orderBy(sql`to_char(${comments.analyzedAt}, 'YYYY-MM-DD')`);
}
