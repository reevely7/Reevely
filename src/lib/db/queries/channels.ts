import "server-only";

import { and, asc, eq, inArray, sql } from "drizzle-orm";

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

// cleanup-expired-comments cron이 보관기간 정리 대상 유저를 찾을 때도 쓰므로
// 잠긴 채널도 포함해 전부 반환한다 — 잠금 여부와 무관하게 데이터 보관기간
// 정책은 지켜져야 한다. sync/분석 파이프라인에서의 잠금 필터링은 호출부
// (process-comments cron)가 channel.status를 직접 보고 처리한다.
export async function getAllChannels() {
  return db.select().from(channels);
}

// 플랜 변경(최초 가입/정기 갱신/해지/다운그레이드) 직후 호출해 채널 잠금 상태를
// 새 한도에 맞게 재조정한다. 먼저 연동한 채널부터 우선권을 준다 — 한도 안에
// 드는 채널은 active로, 넘치는 채널은 locked로. 이미 맞는 상태인 채널은
// 건드리지 않는다.
export async function reconcileChannelLocks(userId: string, limit: number) {
  const userChannels = await db
    .select({ id: channels.id, status: channels.status })
    .from(channels)
    .where(eq(channels.userId, userId))
    .orderBy(asc(channels.createdAt));

  const toActivate = userChannels
    .slice(0, limit)
    .filter((c) => c.status !== "active")
    .map((c) => c.id);
  const toLock = userChannels
    .slice(limit)
    .filter((c) => c.status !== "locked")
    .map((c) => c.id);

  if (toActivate.length > 0) {
    await db
      .update(channels)
      .set({ status: "active" })
      .where(inArray(channels.id, toActivate));
  }
  if (toLock.length > 0) {
    await db
      .update(channels)
      .set({ status: "locked" })
      .where(inArray(channels.id, toLock));
  }
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
  monitoredVideoCount: number,
) {
  await db
    .update(channels)
    .set({
      lastSyncedAt: new Date(),
      monitoredVideoCount,
      ...(latestVideoPublishedAt ? { latestVideoPublishedAt } : {}),
    })
    .where(eq(channels.id, channelId));
}

// refresh token이 만료/취소된 순간 딱 한 번만 기록한다 — 이후 cron은 이 값이
// 찍혀 있으면 재연동 전까지 sync 시도 자체를 건너뛴다 (무한 재시도 방지).
// 반환값은 알림 dedup용 refId로 쓰인다.
export async function markReauthRequired(channelId: string): Promise<Date> {
  const reauthRequiredAt = new Date();
  await db
    .update(channels)
    .set({ reauthRequiredAt })
    .where(eq(channels.id, channelId));
  return reauthRequiredAt;
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
        // 여기 도달했다는 건 방금 유효한 access token으로 YouTube API 조회에
        // 성공했다는 뜻이라, 이전에 재연동이 필요한 상태였어도 항상 해제한다.
        reauthRequiredAt: null,
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
