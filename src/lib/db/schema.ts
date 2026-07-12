import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  numeric,
  uuid,
} from "drizzle-orm/pg-core";

export const channels = pgTable("channels", {
  id: uuid("id").primaryKey().defaultRandom(),
  // 한 유저당 채널 1개 (MVP 범위)
  userId: uuid("user_id").notNull().unique(),
  youtubeChannelId: text("youtube_channel_id").notNull(),
  channelTitle: text("channel_title").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  subscriberCount: integer("subscriber_count"),
  // Google OAuth refresh token — 반드시 암호화된 값만 저장 (src/lib/crypto/token-cipher.ts)
  refreshToken: text("refresh_token").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const riskLevelEnum = pgEnum("risk_level", ["high", "medium", "low"]);

export const commentStatusEnum = pgEnum("comment_status", [
  "confirmed",
  "needs_review",
  "reported_false",
  "whitelisted",
]);

export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Supabase Auth의 auth.users.id를 가리킨다. auth 스키마는 Drizzle이 관리하지
  // 않으므로 DB 레벨 FK는 걸지 않고 애플리케이션 레벨에서 정합성을 유지한다.
  userId: uuid("user_id").notNull(),
  videoId: text("video_id").notNull(),
  authorChannelId: text("author_channel_id").notNull(),
  text: text("text").notNull(),
  riskLevel: riskLevelEnum("risk_level"),
  category: text("category"),
  confidence: numeric("confidence", { precision: 3, scale: 2 }),
  reason: text("reason"),
  status: commentStatusEnum("status").notNull().default("needs_review"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  analyzedAt: timestamp("analyzed_at", { withTimezone: true }),
});
