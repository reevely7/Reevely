import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { authorSubscriptions, channels, comments, notifications } from "@/lib/db/schema";

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

// 채널 연동 해제 시 그 채널에 종속된 데이터를 전부 함께 지운다 — FK 제약이
// 없어서 안 지우면 comments/notifications/author_subscriptions가 영구히
// 고아 상태로 남는다 (재연동해도 upsertChannel이 새 UUID를 발급해 다시
// 연결되지 않음). 개인정보 최소 보관 원칙상으로도 자식 먼저 지운다.
export async function deleteChannelById(channelId: string) {
  await db.delete(comments).where(eq(comments.channelId, channelId));
  await db.delete(notifications).where(eq(notifications.channelId, channelId));
  await db
    .delete(authorSubscriptions)
    .where(eq(authorSubscriptions.channelId, channelId));
  await db.delete(channels).where(eq(channels.id, channelId));
}

// 계정 삭제 시 그 유저의 채널을 전부 지운다 (몇 개든 상관없음)
export async function deleteChannelByUserId(userId: string) {
  await db.delete(channels).where(eq(channels.userId, userId));
}

type Channel = {
  lastSyncedAt: Date | null;
};

// 댓글 업데이트 주기는 신선도가 아니라 플랜별 고정 간격(getSyncIntervalForUser)이다
// — 호출부가 그 값을 intervalMs로 넘긴다.
export function isSyncDue(channel: Channel, intervalMs: number, now: Date = new Date()) {
  return (
    !channel.lastSyncedAt ||
    now.getTime() - channel.lastSyncedAt.getTime() >= intervalMs
  );
}

// 사이드바 상태 표시용 — 다음 자동 확인이 대략 언제일지 계산
export function getNextSyncAt(
  channel: Channel,
  intervalMs: number,
  now: Date = new Date(),
): Date {
  if (!channel.lastSyncedAt) return now;
  return new Date(channel.lastSyncedAt.getTime() + intervalMs);
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
