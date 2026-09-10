import "server-only";

import { encrypt } from "@/lib/crypto/token-cipher";
import { getChannelsByUserId, upsertChannel } from "@/lib/db/queries/channels";
import {
  FREE_CHANNEL_LIMIT,
  getSubscriptionByUserId,
  PLAN_CHANNEL_LIMITS,
} from "@/lib/db/queries/subscriptions";

export class ChannelLimitError extends Error {}

type YouTubeChannelsResponse = {
  items?: Array<{
    id: string;
    snippet: {
      title: string;
      thumbnails?: { default?: { url?: string } };
    };
    statistics?: { subscriberCount?: string; hiddenSubscriberCount?: boolean };
    contentDetails?: { relatedPlaylists?: { uploads?: string } };
  }>;
};

type ConnectChannelInput = {
  userId: string;
  accessToken: string;
  refreshToken: string | null;
};

// 반환값: 연동/갱신된 채널의 id — 호출부가 그 채널로 바로 이동시키는 데 쓴다
export async function connectChannel({
  userId,
  accessToken,
  refreshToken,
}: ConnectChannelInput): Promise<string> {
  const response = await fetch(
    "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&mine=true",
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!response.ok) {
    throw new Error(`YouTube API 채널 조회 실패 (${response.status})`);
  }

  const data: YouTubeChannelsResponse = await response.json();
  const channel = data.items?.[0];

  if (!channel) {
    throw new Error("연동된 구글 계정에 연결된 유튜브 채널이 없습니다.");
  }

  const existingChannels = await getChannelsByUserId(userId);
  const isNewChannel = !existingChannels.some(
    (c) => c.youtubeChannelId === channel.id,
  );

  // 이미 연동된 채널의 재인증(토큰 갱신)은 한도와 무관하게 항상 허용한다.
  // 진짜 새 채널을 추가하는 경우에만 플랜 한도를 체크한다.
  if (isNewChannel) {
    const subscription = await getSubscriptionByUserId(userId);
    const limit = subscription
      ? PLAN_CHANNEL_LIMITS[subscription.plan]
      : FREE_CHANNEL_LIMIT;
    const activeCount = existingChannels.filter(
      (c) => c.status === "active",
    ).length;

    if (activeCount >= limit) {
      throw new ChannelLimitError(
        `현재 플랜에서는 채널을 ${limit}개까지만 연동할 수 있습니다.`,
      );
    }
  }

  return upsertChannel({
    userId,
    youtubeChannelId: channel.id,
    channelTitle: channel.snippet.title,
    thumbnailUrl: channel.snippet.thumbnails?.default?.url ?? null,
    subscriberCount:
      channel.statistics?.subscriberCount != null
        ? Number(channel.statistics.subscriberCount)
        : null,
    uploadsPlaylistId:
      channel.contentDetails?.relatedPlaylists?.uploads ?? null,
    encryptedRefreshToken: refreshToken ? encrypt(refreshToken) : undefined,
  });
}
