import "server-only";

import { decrypt } from "@/lib/crypto/token-cipher";
import { markSynced } from "@/lib/db/queries/channels";
import { insertNewComments } from "@/lib/db/queries/comments";
import { refreshAccessToken } from "@/lib/youtube/refresh-access-token";

// 채널 규모와 무관하게 한 번의 sync가 쓰는 API 쿼터/비용 상한
const MAX_VIDEOS = 10;
const MAX_COMMENTS_PER_VIDEO = 100;

type SyncableChannel = {
  id: string;
  userId: string;
  uploadsPlaylistId: string | null;
  refreshToken: string;
};

type YouTubePlaylistItemsResponse = {
  items?: Array<{
    contentDetails: { videoId: string; videoPublishedAt?: string };
  }>;
};

type YouTubeCommentSnippet = {
  textOriginal: string;
  authorChannelId?: { value: string };
  publishedAt: string;
};

type YouTubeCommentThreadsResponse = {
  items?: Array<{
    snippet: {
      topLevelComment: {
        id: string;
        snippet: YouTubeCommentSnippet;
      };
    };
    // part=replies로 요청 시 스레드당 최대 5개까지 유튜브가 자동으로 붙여줌
    // (그 이상은 comments.list를 parentId로 별도 호출해야 하며, 쿼터가
    // 스레드 수만큼 늘어나 유료 플랜 확장 시 별도로 다룰 예정)
    replies?: {
      comments?: Array<{ id: string; snippet: YouTubeCommentSnippet }>;
    };
  }>;
};

export async function syncComments(channel: SyncableChannel) {
  if (!channel.uploadsPlaylistId) {
    throw new Error(
      "업로드 재생목록 정보가 없습니다. 채널을 다시 연동해 주세요.",
    );
  }

  const accessToken = await refreshAccessToken(decrypt(channel.refreshToken));

  const playlistRes = await fetch(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${channel.uploadsPlaylistId}&maxResults=${MAX_VIDEOS}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!playlistRes.ok) {
    throw new Error(`영상 목록 조회 실패 (${playlistRes.status})`);
  }

  const playlistData: YouTubePlaylistItemsResponse = await playlistRes.json();
  const items = playlistData.items ?? [];
  const videoIds = items.map((item) => item.contentDetails.videoId);

  // uploads 재생목록은 최신순이라 첫 항목이 가장 최근 영상의 게시 시각
  const latestVideoPublishedAt = items[0]?.contentDetails.videoPublishedAt
    ? new Date(items[0].contentDetails.videoPublishedAt)
    : null;

  let totalFetched = 0;
  let totalNew = 0;

  for (const videoId of videoIds) {
    const commentsRes = await fetch(
      `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet,replies&videoId=${videoId}&maxResults=${MAX_COMMENTS_PER_VIDEO}&order=time&textFormat=plainText`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (!commentsRes.ok) {
      // 댓글이 막혀있거나 삭제된 영상 등 — 건너뛰고 계속 진행
      continue;
    }

    const commentsData: YouTubeCommentThreadsResponse =
      await commentsRes.json();
    const commentItems = commentsData.items ?? [];

    const toRow = (id: string, snippet: YouTubeCommentSnippet) => ({
      userId: channel.userId,
      videoId,
      youtubeCommentId: id,
      authorChannelId: snippet.authorChannelId?.value ?? "unknown",
      text: snippet.textOriginal,
      createdAt: new Date(snippet.publishedAt),
    });

    // 최상위 댓글 + 대댓글 합산 개수를 MAX_COMMENTS_PER_VIDEO로 제한한다.
    // (대댓글이 스레드당 최대 5개씩 딸려오므로, 스레드 수만 제한하면 영상 하나당
    // 최대 수백 개까지 늘어날 수 있어 원래의 비용 방어 취지가 깨진다)
    const rows = commentItems
      .flatMap((item) => {
        const top = item.snippet.topLevelComment;
        const replies = item.replies?.comments ?? [];
        return [
          toRow(top.id, top.snippet),
          ...replies.map((reply) => toRow(reply.id, reply.snippet)),
        ];
      })
      .slice(0, MAX_COMMENTS_PER_VIDEO);
    totalFetched += rows.length;

    totalNew += await insertNewComments(rows);
  }

  await markSynced(channel.id, latestVideoPublishedAt);

  return {
    videosScanned: videoIds.length,
    commentsFetched: totalFetched,
    newComments: totalNew,
  };
}
