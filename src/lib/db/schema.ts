import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  numeric,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

// 채널이 연결된 플랫폼. 유튜브 외 인스타그램 등 추가 연동을 대비한 구분자.
export const platformEnum = pgEnum("platform", ["youtube", "instagram"]);

export const channels = pgTable(
  "channels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    // 한 유저당 플랫폼별로 채널 1개 (아래 unique 제약 참조). MVP는 유튜브만 실제 연동.
    platform: platformEnum("platform").notNull().default("youtube"),
    youtubeChannelId: text("youtube_channel_id").notNull(),
    channelTitle: text("channel_title").notNull(),
    thumbnailUrl: text("thumbnail_url"),
    subscriberCount: integer("subscriber_count"),
    // 댓글 sync 시 영상 목록을 가져오는 데 쓰는 업로드 재생목록 ID (유튜브 전용)
    uploadsPlaylistId: text("uploads_playlist_id"),
    // OAuth refresh token — 반드시 암호화된 값만 저장 (src/lib/crypto/token-cipher.ts)
    refreshToken: text("refresh_token").notNull(),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    // 최신 업로드 영상의 게시 시각 — 신선도 기반 폴링 주기 계산에 사용
    latestVideoPublishedAt: timestamp("latest_video_published_at", {
      withTimezone: true,
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [unique("channels_user_platform_unique").on(table.userId, table.platform)],
);

export const riskLevelEnum = pgEnum("risk_level", ["high", "medium", "low"]);

export const commentStatusEnum = pgEnum("comment_status", [
  "confirmed",
  "needs_review",
  "reported_false",
  "whitelisted",
]);

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Supabase Auth의 auth.users.id를 가리킨다. auth 스키마는 Drizzle이 관리하지
    // 않으므로 DB 레벨 FK는 걸지 않고 애플리케이션 레벨에서 정합성을 유지한다.
    userId: uuid("user_id").notNull(),
    // 이 댓글이 어느 플랫폼에서 수집됐는지. MVP는 유튜브만 실제 수집.
    platform: platformEnum("platform").notNull().default("youtube"),
    videoId: text("video_id").notNull(),
    // 재-sync 시 중복 저장을 막기 위한 원본 댓글 ID (플랫폼별로 유일하면 되므로
    // 아래 unique 제약은 platform과 묶어서 건다)
    youtubeCommentId: text("youtube_comment_id").notNull(),
    authorChannelId: text("author_channel_id").notNull(),
    text: text("text").notNull(),
    // AI 판정 결과 (미분석 상태면 전부 null)
    isMalicious: boolean("is_malicious"),
    riskLevel: riskLevelEnum("risk_level"),
    category: text("category"),
    confidence: numeric("confidence", { precision: 3, scale: 2 }),
    reason: text("reason"),
    // 판정에 사용된 모델·프롬프트 버전 (추후 파인튜닝 학습 데이터의 출처 구분용)
    aiModel: text("ai_model"),
    promptVersion: text("prompt_version"),
    status: commentStatusEnum("status").notNull().default("needs_review"),
    // status가 시스템 자동확정(confidence>=0.7)인지 사람이 검토 큐에서 직접
    // 확정/신고한 것인지 구분 (파인튜닝 학습 데이터의 신뢰도 판단용)
    isHumanReviewed: boolean("is_human_reviewed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    analyzedAt: timestamp("analyzed_at", { withTimezone: true }),
  },
  (table) => [
    unique("comments_platform_comment_unique").on(
      table.platform,
      table.youtubeCommentId,
    ),
  ],
);
