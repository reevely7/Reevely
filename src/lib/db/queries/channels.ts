import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { channels } from "@/lib/db/schema";

// 신선도 기반 폴링: 최근 업로드된 영상이 있는 채널은 자주, 그 외는 느슨하게 확인한다.
// (유튜브는 댓글 웹훅이 없어 폴링만 가능 — 새 영상 직후 24~48시간에 댓글이 몰리는
// 경향을 이용해 쿼터를 소수의 "활성" 채널에 집중시킨다)
const FRESH_WINDOW_MS = 48 * 60 * 60 * 1000;
const FRESH_INTERVAL_MS = 60 * 60 * 1000;
const STALE_INTERVAL_MS = 6 * 60 * 60 * 1000;

export async function getChannelByUserId(userId: string) {
  const [channel] = await db
    .select()
    .from(channels)
    .where(eq(channels.userId, userId))
    .limit(1);

  return channel ?? null;
}

// cron이 전체 연동 채널을 순회하며 자동 sync+분석을 돌릴 때 사용
export async function getAllChannels() {
  return db.select().from(channels);
}

export async function deleteChannelByUserId(userId: string) {
  await db.delete(channels).where(eq(channels.userId, userId));
}

type Channel = {
  lastSyncedAt: Date | null;
  latestVideoPublishedAt: Date | null;
};

export function isSyncDue(channel: Channel, now: Date = new Date()) {
  const isFresh =
    channel.latestVideoPublishedAt != null &&
    now.getTime() - channel.latestVideoPublishedAt.getTime() <
      FRESH_WINDOW_MS;

  const interval = isFresh ? FRESH_INTERVAL_MS : STALE_INTERVAL_MS;

  return (
    !channel.lastSyncedAt ||
    now.getTime() - channel.lastSyncedAt.getTime() >= interval
  );
}

// 사이드바 상태 표시용 — 다음 자동 확인이 대략 언제일지 계산
export function getNextSyncAt(channel: Channel, now: Date = new Date()): Date {
  if (!channel.lastSyncedAt) return now;

  const isFresh =
    channel.latestVideoPublishedAt != null &&
    now.getTime() - channel.latestVideoPublishedAt.getTime() <
      FRESH_WINDOW_MS;

  const interval = isFresh ? FRESH_INTERVAL_MS : STALE_INTERVAL_MS;
  return new Date(channel.lastSyncedAt.getTime() + interval);
}

export async function markSynced(
  channelId: string,
  latestVideoPublishedAt: Date | null,
) {
  await db
    .update(channels)
    .set({
      lastSyncedAt: new Date(),
      ...(latestVideoPublishedAt ? { latestVideoPublishedAt } : {}),
    })
    .where(eq(channels.id, channelId));
}

type UpsertChannelInput = {
  userId: string;
  youtubeChannelId: string;
  channelTitle: string;
  thumbnailUrl: string | null;
  subscriberCount: number | null;
  uploadsPlaylistId: string | null;
  encryptedRefreshToken?: string;
};

export async function upsertChannel(input: UpsertChannelInput) {
  const existing = await getChannelByUserId(input.userId);

  if (existing) {
    await db
      .update(channels)
      .set({
        youtubeChannelId: input.youtubeChannelId,
        channelTitle: input.channelTitle,
        thumbnailUrl: input.thumbnailUrl,
        subscriberCount: input.subscriberCount,
        uploadsPlaylistId: input.uploadsPlaylistId,
        updatedAt: new Date(),
        ...(input.encryptedRefreshToken
          ? { refreshToken: input.encryptedRefreshToken }
          : {}),
      })
      .where(eq(channels.id, existing.id));
    return;
  }

  if (!input.encryptedRefreshToken) {
    throw new Error("최초 채널 연동 시 refresh token이 반드시 필요합니다.");
  }

  await db.insert(channels).values({
    userId: input.userId,
    youtubeChannelId: input.youtubeChannelId,
    channelTitle: input.channelTitle,
    thumbnailUrl: input.thumbnailUrl,
    subscriberCount: input.subscriberCount,
    uploadsPlaylistId: input.uploadsPlaylistId,
    refreshToken: input.encryptedRefreshToken,
  });
}
