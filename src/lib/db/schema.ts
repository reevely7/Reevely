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

// 유튜브 API는 쇼츠 여부를 직접 알려주지 않아 /shorts/{id} 라우팅 동작으로
// 판별한다 (src/lib/youtube/sync-comments.ts의 detectVideoType 참조)
export const videoTypeEnum = pgEnum("video_type", ["video", "shorts"]);

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
    // 영상 제목·종류(동영상/쇼츠)는 유튜브 전용. 인스타그램 연동 시에는 null.
    videoTitle: text("video_title"),
    videoType: videoTypeEnum("video_type"),
    // 재-sync 시 중복 저장을 막기 위한 원본 댓글 ID (플랫폼별로 유일하면 되므로
    // 아래 unique 제약은 platform과 묶어서 건다)
    youtubeCommentId: text("youtube_comment_id").notNull(),
    authorChannelId: text("author_channel_id").notNull(),
    // 작성자가 유튜브에 공개 설정한 표시 이름 (실명 아님)
    authorDisplayName: text("author_display_name"),
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

// 크리에이터가 "새 댓글 알림 받기"로 구독한 작성자 목록. cron 분석 파이프라인이
// 새로 분석된 악성 댓글의 authorChannelId가 여기 있으면 notifications 행을 만든다.
export const authorSubscriptions = pgTable(
  "author_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    authorChannelId: text("author_channel_id").notNull(),
    // 알림 목록에 표시할 스냅샷 (댓글 재조회 없이 바로 보여주기 위함)
    authorDisplayName: text("author_display_name"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("author_subscriptions_user_author_unique").on(
      table.userId,
      table.authorChannelId,
    ),
  ],
);

export const notificationTypeEnum = pgEnum("notification_type", [
  // 구독 중인 작성자의 새 악성 댓글 — comments를 조인해서 위험도·유형·본문을 보여준다
  "new_comment",
  // 아직 구독 안 한 작성자가 누적 3번째 악성 댓글을 남겼을 때의 구독 제안
  "repeat_author",
  // 검토 필요 큐가 임계치 이상 쌓였을 때
  "review_backlog",
  // 특정 영상에 짧은 시간 안에 악성 댓글이 몰릴 때
  "video_spike",
  // 주간 요약 리포트
  "weekly_digest",
]);

// notifications 1행 = 알림 1건. new_comment 타입은 comments를 조인해서 위험도·
// 본문 등을 그대로 보여주고(commentId만 있으면 됨), 그 외 타입은 댓글 하나에
// 매이지 않는 알림이라 title/message/href를 생성 시점에 미리 만들어 저장한다.
// refId는 종류별 중복 방지용 보조 키(작성자ID, 영상ID 등)로만 쓴다.
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  type: notificationTypeEnum("type").notNull().default("new_comment"),
  commentId: uuid("comment_id"),
  title: text("title"),
  message: text("message"),
  href: text("href"),
  refId: text("ref_id"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
