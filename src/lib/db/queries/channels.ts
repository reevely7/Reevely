import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { channels } from "@/lib/db/schema";

export async function getChannelByUserId(userId: string) {
  const [channel] = await db
    .select()
    .from(channels)
    .where(eq(channels.userId, userId))
    .limit(1);

  return channel ?? null;
}

type UpsertChannelInput = {
  userId: string;
  youtubeChannelId: string;
  channelTitle: string;
  thumbnailUrl: string | null;
  subscriberCount: number | null;
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
    refreshToken: input.encryptedRefreshToken,
  });
}
