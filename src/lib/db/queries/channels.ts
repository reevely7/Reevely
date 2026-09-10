import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { channels } from "@/lib/db/schema";

export async function getChannelsByUserId(userId: string) {
  return db
    .select()
    .from(channels)
    .where(eq(channels.userId, userId))
    .orderBy(asc(channels.createdAt));
}

export async function getChannelById(channelId: string) {
  const [channel] = await db
    .select()
    .from(channels)
    .where(eq(channels.id, channelId))
    .limit(1);

  return channel ?? null;
}

export async function countActiveChannelsByUserId(userId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(channels)
    .where(and(eq(channels.userId, userId), eq(channels.status, "active")));

  return row?.count ?? 0;
}

// cron이 전체 연동 채널을 순회하며 자동 sync+분석을 돌릴 때 사용
export async function getAllChannels() {
  return db.select().from(channels);
}

export async function deleteChannelById(channelId: string) {
  await db.delete(channels).where(eq(channels.id, channelId));
}

// 계정 삭제 시 그 유저의 채널을 전부 지운다 (몇 개든 상관없음)
export async function deleteChannelByUserId(userId: string) {
  await db.delete(channels).where(eq(channels.userId, userId));
}

type Channel = {
  lastSyncedAt: Date | null;
  latestVideoPublishedAt: Date | null;
};

const FRESH_WINDOW_MS = 48 * 60 * 60 * 1000;
const FRESH_INTERVAL_MS = 60 * 60 * 1000;
const STALE_INTERVAL_MS = 6 * 60 * 60 * 1000;

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

// (userId, youtubeChannelId) 조합으로 기존 채널인지 판단한다 — 같은 채널을 다시
// 연동(토큰 갱신)하면 update, 새 채널이면 insert. 채널 id를 리턴해서 호출부가
// 방금 연동/갱신된 채널로 바로 이동할 수 있게 한다.
export async function upsertChannel(input: UpsertChannelInput): Promise<string> {
  const [existing] = await db
    .select()
    .from(channels)
    .where(
      and(
        eq(channels.userId, input.userId),
        eq(channels.youtubeChannelId, input.youtubeChannelId),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .update(channels)
      .set({
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
    return existing.id;
  }

  if (!input.encryptedRefreshToken) {
    throw new Error("최초 채널 연동 시 refresh token이 반드시 필요합니다.");
  }

  const [inserted] = await db
    .insert(channels)
    .values({
      userId: input.userId,
      youtubeChannelId: input.youtubeChannelId,
      channelTitle: input.channelTitle,
      thumbnailUrl: input.thumbnailUrl,
      subscriberCount: input.subscriberCount,
      uploadsPlaylistId: input.uploadsPlaylistId,
      refreshToken: input.encryptedRefreshToken,
    })
    .returning({ id: channels.id });

  return inserted.id;
}
