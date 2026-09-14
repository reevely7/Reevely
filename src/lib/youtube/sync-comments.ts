import "server-only";

import { decrypt } from "@/lib/crypto/token-cipher";
import { markSynced } from "@/lib/db/queries/channels";
import { getKnownVideoTypes, insertNewComments } from "@/lib/db/queries/comments";
import {
  getCollectRepliesForUser,
  getVideoLimitForUser,
} from "@/lib/db/queries/subscriptions";
import { YOUTUBE_API_UNIT_COSTS, recordYoutubeApiUsage } from "@/lib/db/queries/youtube-quota";
import { mapWithConcurrency } from "@/lib/utils/concurrency";
import { refreshAccessToken } from "@/lib/youtube/refresh-access-token";

// 한 sync가 모니터링하는 영상 수는 플랜별로 다르다(getVideoLimitForUser) — 여기
// 상수는 영상 하나당 댓글 상한만 맡는다. 프로 플랜은 영상 수 제한이 없어(null)
// 재생목록 끝까지 페이지네이션한다 — 영상이 아주 많은 채널은 sync당 유튜브 API
// 쿼터를 많이 쓰게 됨(playlistItems.list 호출 수가 그만큼 늘어남).
const MAX_COMMENTS_PER_VIDEO = 100;
const PLAYLIST_PAGE_SIZE = 50; // YouTube playlistItems.list maxResults 상한
// detectVideoType은 Data API가 아닌 youtube.com 스크래핑이라, 영상 수만큼
// 무제한 병렬로 보내면 봇 탐지에 걸리기 쉽다 — 동시 요청 수를 제한한다.
const VIDEO_TYPE_DETECT_CONCURRENCY = 5;

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
  nextPageToken?: string;
};

type YouTubeCommentSnippet = {
  textOriginal: string;
  authorChannelId?: { value: string };
  authorDisplayName?: string;
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

type YouTubeVideosListResponse = {
  items?: Array<{
    id: string;
    snippet: { title: string };
  }>;
};

type VideoMeta = { title: string; type: "video" | "shorts" };

// 유튜브 데이터 API에는 쇼츠 여부를 알려주는 공식 필드가 없다. 대신 유튜브
// 자체 라우팅 동작을 이용한다: 쇼츠가 아닌 videoId로 /shorts/{id}에 접속하면
// /watch로 302/303 리다이렉트되고, 실제 쇼츠는 200으로 그대로 응답한다.
// Data API 쿼터를 쓰지 않는 별도의 공개 페이지 요청이라 sync당 요청 수만
// 늘어날 뿐 유닛 비용은 없다.
async function detectVideoType(videoId: string): Promise<"video" | "shorts"> {
  try {
    const res = await fetch(`https://www.youtube.com/shorts/${videoId}`, {
      redirect: "manual",
    });
    return res.status === 200 ? "shorts" : "video";
  } catch (e) {
    console.error(`[sync] 영상 타입 판별 실패 (videoId=${videoId}):`, e);
    return "video";
  }
}

// 플랜별 영상 모니터링 상한(videoLimit)만큼 재생목록을 페이지네이션해서 가져온다.
// videoLimit이 null이면(pro) 재생목록 끝까지 전부 가져온다. 첫 페이지 조회
// 실패는 sync 자체를 실패시키고, 이후 페이지 실패는 지금까지 모은 것만으로
// 계속 진행한다(이미 확보한 영상까지는 정상적으로 동기화하기 위함).
async function fetchVideoIds(
  playlistId: string,
  accessToken: string,
  videoLimit: number | null,
): Promise<{ videoIds: string[]; latestVideoPublishedAt: Date | null }> {
  const videoIds: string[] = [];
  let latestVideoPublishedAt: Date | null = null;
  let pageToken: string | undefined;
  let isFirstPage = true;

  do {
    const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    url.searchParams.set("part", "contentDetails");
    url.searchParams.set("playlistId", playlistId);
    url.searchParams.set("maxResults", String(PLAYLIST_PAGE_SIZE));
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const playlistRes = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    await recordYoutubeApiUsage(YOUTUBE_API_UNIT_COSTS.playlistItemsList);

    if (!playlistRes.ok) {
      if (isFirstPage) {
        throw new Error(`영상 목록 조회 실패 (${playlistRes.status})`);
      }
      break;
    }

    const playlistData: YouTubePlaylistItemsResponse = await playlistRes.json();
    const items = playlistData.items ?? [];

    // uploads 재생목록은 최신순이라 첫 페이지의 첫 항목이 가장 최근 영상의 게시 시각
    if (isFirstPage && items[0]?.contentDetails.videoPublishedAt) {
      latestVideoPublishedAt = new Date(items[0].contentDetails.videoPublishedAt);
    }

    videoIds.push(...items.map((item) => item.contentDetails.videoId));
    pageToken = playlistData.nextPageToken;
    isFirstPage = false;
  } while (pageToken && (videoLimit === null || videoIds.length < videoLimit));

  return {
    videoIds: videoLimit === null ? videoIds : videoIds.slice(0, videoLimit),
    latestVideoPublishedAt,
  };
}

async function fetchVideoMeta(
  channelId: string,
  videoIds: string[],
  accessToken: string,
): Promise<Map<string, VideoMeta>> {
  const metaById = new Map<string, VideoMeta>();
  if (videoIds.length === 0) return metaById;

  const [res, knownTypes] = await Promise.all([
    fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoIds.join(",")}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    ),
    getKnownVideoTypes(channelId, videoIds),
  ]);
  await recordYoutubeApiUsage(YOUTUBE_API_UNIT_COSTS.videosList);
  if (!res.ok) return metaById;

  const data: YouTubeVideosListResponse = await res.json();
  const titleById = new Map(
    (data.items ?? []).map((item) => [item.id, item.snippet.title]),
  );

  // 이미 이전 sync에서 쇼츠/영상이 확정된 영상은 다시 스크래핑하지 않는다
  const unknownIds = videoIds.filter(
    (id) => titleById.has(id) && !knownTypes.has(id),
  );
  const detected = await mapWithConcurrency(
    unknownIds,
    VIDEO_TYPE_DETECT_CONCURRENCY,
    async (id) => [id, await detectVideoType(id)] as const,
  );
  const detectedById = new Map(detected);

  for (const id of videoIds) {
    const title = titleById.get(id);
    if (!title) continue;
    const type = knownTypes.get(id) ?? detectedById.get(id) ?? "video";
    metaById.set(id, { title, type });
  }

  return metaById;
}

export async function syncComments(channel: SyncableChannel) {
  if (!channel.uploadsPlaylistId) {
    throw new Error(
      "업로드 재생목록 정보가 없습니다. 채널을 다시 연동해 주세요.",
    );
  }

  const accessToken = await refreshAccessToken(decrypt(channel.refreshToken));
  const [videoLimit, collectReplies] = await Promise.all([
    getVideoLimitForUser(channel.userId),
    getCollectRepliesForUser(channel.userId),
  ]);

  const { videoIds, latestVideoPublishedAt } = await fetchVideoIds(
    channel.uploadsPlaylistId,
    accessToken,
    videoLimit,
  );

  const videoMetaById = await fetchVideoMeta(channel.id, videoIds, accessToken);

  let totalFetched = 0;
  let totalNew = 0;

  const commentThreadsPart = collectReplies ? "snippet,replies" : "snippet";

  for (const videoId of videoIds) {
    const commentsRes = await fetch(
      `https://www.googleapis.com/youtube/v3/commentThreads?part=${commentThreadsPart}&videoId=${videoId}&maxResults=${MAX_COMMENTS_PER_VIDEO}&order=time&textFormat=plainText`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    await recordYoutubeApiUsage(YOUTUBE_API_UNIT_COSTS.commentThreadsList);

    if (!commentsRes.ok) {
      // 댓글이 막혀있거나 삭제된 영상 등 — 건너뛰고 계속 진행
      continue;
    }

    const commentsData: YouTubeCommentThreadsResponse =
      await commentsRes.json();
    const commentItems = commentsData.items ?? [];
    const videoMeta = videoMetaById.get(videoId);

    const toRow = (id: string, snippet: YouTubeCommentSnippet) => ({
      userId: channel.userId,
      channelId: channel.id,
      videoId,
      videoTitle: videoMeta?.title ?? null,
      videoType: videoMeta?.type ?? null,
      youtubeCommentId: id,
      authorChannelId: snippet.authorChannelId?.value ?? "unknown",
      authorDisplayName: snippet.authorDisplayName ?? null,
      text: snippet.textOriginal,
      createdAt: new Date(snippet.publishedAt),
    });

    // 최상위 댓글 + 대댓글(무료 플랜은 대댓글 미수집) 합산 개수를
    // MAX_COMMENTS_PER_VIDEO로 제한한다. (대댓글이 스레드당 최대 5개씩
    // 딸려오므로, 스레드 수만 제한하면 영상 하나당 최대 수백 개까지 늘어날 수
    // 있어 원래의 비용 방어 취지가 깨진다)
    const rows = commentItems
      .flatMap((item) => {
        const top = item.snippet.topLevelComment;
        if (!collectReplies) return [toRow(top.id, top.snippet)];

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
