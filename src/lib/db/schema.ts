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

export const channelStatusEnum = pgEnum("channel_status", ["active", "locked"]);

export const channels = pgTable(
  "channels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    // 한 유저는 채널을 여러 개 연동할 수 있다 — 아래 unique 제약은 동일한 유튜브
    // 채널을 중복 연동하는 것만 막는다 (개수 제한은 플랜 로직이 담당). MVP는 유튜브만 실제 연동.
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
    // 잠긴 채널은 cron sync 대상에서 제외됨(다운그레이드로 플랜 한도 초과 시)
    status: channelStatusEnum("status").notNull().default("active"),
    // non-null이면 refresh token이 만료/취소되어 재연동이 필요하다는 뜻
    // (값은 최초 감지된 시각). 재연동 성공 시 upsertChannel이 null로 되돌린다.
    reauthRequiredAt: timestamp("reauth_required_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  // 같은 유튜브 채널 중복 연동만 막는다 — 유저당 개수 제한은 플랜 로직이 담당
  (table) => [unique("channels_user_youtube_unique").on(table.userId, table.youtubeChannelId)],
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
    channelId: uuid("channel_id").notNull(),
    // 이 댓글이 어느 플랫폼에서 수집됐는지. MVP는 유튜브만 실제 수집.
    platform: platformEnum("platform").notNull().default("youtube"),
    videoId: text("video_id").notNull(),
    // 영상 제목·종류(동영상/쇼츠)는 유튜브 전용. 인스타그램 연동 시에는 null.
    videoTitle: text("video_title"),
    videoType: videoTypeEnum("video_type"),
    // 재-sync 시 중복 저장을 막기 위한 원본 댓글 ID. 유튜브 댓글 ID는 전역
    // 유일하지만, 같은 실제 채널을 서로 다른 Reevely 계정(channelId)이 각자
    // 연동할 수 있어 아래 unique 제약은 channelId와 묶어서 건다 — 그래야 두
    // 계정이 독립적으로 같은 댓글을 각자 보관한다 (한쪽이 먼저 저장했다고
    // 다른 계정 쪽 insert가 조용히 무시되지 않음)
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
    // 증거 보관함(evidence archive)에 저장했는지 — 플랜별 저장 건수 한도가 있어
    // (계정 전체 채널 합산) archivedAt으로 보관함 페이지 정렬에 쓴다
    isArchived: boolean("is_archived").notNull().default(false),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    analyzedAt: timestamp("analyzed_at", { withTimezone: true }),
  },
  (table) => [
    unique("comments_channel_comment_unique").on(
      table.channelId,
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
    channelId: uuid("channel_id").notNull(),
    authorChannelId: text("author_channel_id").notNull(),
    // 알림 목록에 표시할 스냅샷 (댓글 재조회 없이 바로 보여주기 위함)
    authorDisplayName: text("author_display_name"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("author_subscriptions_channel_author_unique").on(
      table.channelId,
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
  // 정기 결제 실패, 유예기간 시작
  "payment_failed",
  // 재시도까지 실패해 무료로 전환됨
  "payment_downgraded",
  // 이번 달 플랜별 댓글 분석 한도를 다 썼음 (계정 전체 채널 합산 기준)
  "analysis_quota_reached",
  // 유튜브 refresh token이 만료/취소되어 재연동이 필요함
  "reauth_required",
]);

// notifications 1행 = 알림 1건. new_comment 타입은 comments를 조인해서 위험도·
// 본문 등을 그대로 보여주고(commentId만 있으면 됨), 그 외 타입은 댓글 하나에
// 매이지 않는 알림이라 title/message/href를 생성 시점에 미리 만들어 저장한다.
// refId는 종류별 중복 방지용 보조 키(작성자ID, 영상ID 등)로만 쓴다.
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  // payment_failed/payment_downgraded/analysis_quota_reached만 예외적으로 null
  // (계정 단위 알림이라 특정 채널에 안 묶임). 그 외 타입은 전부 채널 종속이라
  // 애플리케이션 레벨에서 항상 채운다.
  channelId: uuid("channel_id"),
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

export const subscriptionPlanEnum = pgEnum("subscription_plan", [
  "basic",
  "plus",
  "pro",
]);
// 무료는 별도 값이 없다 — subscriptions에 row가 없으면 무료로 취급한다.

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active", // 정상 구독 중, nextBillingDate에 정기 청구
  "canceled_pending", // 해지 신청함. 이미 낸 기간은 유지, nextBillingDate에 row 삭제(무료 전환)
  "payment_failed", // 정기 청구 실패, 유예기간 중. nextBillingDate는 재시도 예정일로 재사용됨
]);

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().unique(),
  plan: subscriptionPlanEnum("plan").notNull(),
  // 다음 결제일부터 적용될 플랜 변경 예약. 변경 없으면 null.
  pendingPlan: subscriptionPlanEnum("pending_plan"),
  status: subscriptionStatusEnum("status").notNull().default("active"),
  // 토스 빌링키 — refresh token과 동일하게 암호화 저장 (src/lib/crypto/token-cipher.ts)
  billingKey: text("billing_key").notNull(),
  // 토스 빌링 API가 요구하는 상점 측 고객 식별자. userId를 그대로 사용한다.
  tossCustomerKey: text("toss_customer_key").notNull(),
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true }).notNull(),
  // 정상 상태에선 "다음 정기결제일", payment_failed 상태에선 "재시도 예정일"로 재사용
  nextBillingDate: timestamp("next_billing_date", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// 크리에이터 계정(카카오 로그인, auth.users)과는 완전히 분리된 내부 운영진
// 전용 계정. Supabase Auth를 쓰지 않고 이 테이블 하나로 아이디/비밀번호를
// 직접 관리한다 — 별도 로그인 화면(/admin/login)에서만 검증한다.
export const adminUsers = pgTable("admin_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  // scrypt 해시 (src/lib/crypto/password.ts) — 평문 저장 금지
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const paymentStatusEnum = pgEnum("payment_status", ["succeeded", "failed"]);

// 결제 시도 감사 로그 — 결제 문의 대응, 영수증 표시용
export const paymentHistory = pgTable("payment_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  plan: subscriptionPlanEnum("plan").notNull(),
  amount: integer("amount").notNull(),
  status: paymentStatusEnum("status").notNull(),
  tossPaymentKey: text("toss_payment_key"),
  failReason: text("fail_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
