import "server-only";

import { encrypt } from "@/lib/crypto/token-cipher";
import { upsertChannel } from "@/lib/db/queries/channels";

type YouTubeChannelsResponse = {
  items?: Array<{
    id: string;
    snippet: {
      title: string;
      thumbnails?: { default?: { url?: string } };
    };
    statistics?: { subscriberCount?: string; hiddenSubscriberCount?: boolean };
  }>;
};

type ConnectChannelInput = {
  userId: string;
  accessToken: string;
  refreshToken: string | null;
};

export async function connectChannel({
  userId,
  accessToken,
  refreshToken,
}: ConnectChannelInput) {
  const response = await fetch(
    "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true",
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

  await upsertChannel({
    userId,
    youtubeChannelId: channel.id,
    channelTitle: channel.snippet.title,
    thumbnailUrl: channel.snippet.thumbnails?.default?.url ?? null,
    subscriberCount:
      channel.statistics?.subscriberCount != null
        ? Number(channel.statistics.subscriberCount)
        : null,
    encryptedRefreshToken: refreshToken ? encrypt(refreshToken) : undefined,
  });
}
