import Link from "next/link";
import { Clapperboard } from "lucide-react";

import { CommentSearch } from "@/components/dashboard/comment-search";
import { Pagination } from "@/components/dashboard/pagination";
import { VideoSortFilter } from "@/components/dashboard/video-sort-filter";
import { VideoTypeFilter } from "@/components/dashboard/video-type-filter";
import { requireChannelOwnership } from "@/lib/auth/require-channel-ownership";
import { countVideos, searchVideos } from "@/lib/db/queries/comments";

const PAGE_SIZE = 20;

function formatDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
}

export default async function VideoSearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ channelId: string }>;
  searchParams: Promise<{
    q?: string;
    type?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const { channelId } = await params;
  await requireChannelOwnership(channelId);
  const { q, type, sort, page: pageParam } = await searchParams;
  const query = q?.trim() ?? "";
  const videoType = type === "video" || type === "shorts" ? type : undefined;
  const sortOrder = sort === "malicious" ? "malicious" : "latest";
  const page = Math.max(1, Number(pageParam) || 1);

  const [results, totalCount] = await Promise.all([
    searchVideos(
      channelId,
      query,
      PAGE_SIZE,
      (page - 1) * PAGE_SIZE,
      videoType,
      sortOrder,
    ),
    countVideos(channelId, query, videoType),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8 sm:px-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xl font-semibold tracking-tight text-foreground">
            영상별 보기
          </p>
          <p className="text-xs text-muted-foreground">
            영상 제목으로 검색해 해당 영상의 악성 댓글을 확인합니다.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <VideoTypeFilter />
          <VideoSortFilter />
          <CommentSearch
            paramKey="q"
            placeholder="영상 제목 검색"
            widthClassName="sm:w-96"
          />
        </div>
      </header>

      {results.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-card px-6 py-16 text-center">
          <Clapperboard className="size-8 text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">
            {query
              ? `"${query}"와(과) 일치하는 영상이 없습니다.`
              : "아직 악성 댓글이 발견된 영상이 없습니다."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {results.map((video) => (
              <Link
                key={video.videoId}
                href={`/c/${channelId}/comments?video=${encodeURIComponent(video.videoId)}`}
                className="group flex flex-col gap-2"
              >
                <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`}
                    alt=""
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                  <span className="absolute right-1.5 bottom-1.5 rounded bg-black/75 px-1.5 py-0.5 text-xs font-medium text-white">
                    악성 댓글 {video.count}건
                  </span>
                  {video.videoType === "shorts" && (
                    <span className="absolute top-1.5 left-1.5 rounded bg-black px-1.5 py-0.5 text-xs font-bold text-white">
                      쇼츠
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-0.5">
                  <p
                    className="line-clamp-2 text-sm font-semibold text-foreground group-hover:text-primary"
                    title={video.videoTitle ?? video.videoId}
                  >
                    {video.videoTitle ?? video.videoId}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    최근 댓글 {formatDate(video.lastCommentAt)}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <Pagination currentPage={page} totalPages={totalPages} />
          )}
        </div>
      )}
    </main>
  );
}
