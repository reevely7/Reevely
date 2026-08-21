import Link from "next/link";

type VideoRow = {
  videoId: string;
  videoTitle: string | null;
  count: number;
};

export function TopVideosCard({ rows }: { rows: VideoRow[] }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-card px-5 py-4">
      <p className="text-sm font-medium text-card-foreground">
        최근 위험 댓글이 몰린 영상
      </p>

      {rows.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          아직 데이터가 충분하지 않습니다.
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {rows.map((row, i) => (
            <Link
              key={row.videoId}
              href={`/comments?video=${encodeURIComponent(row.videoId)}`}
              className="flex items-center gap-3 py-2.5 hover:text-primary"
            >
              <span className="w-4 shrink-0 font-mono text-xs text-muted-foreground">
                {i + 1}
              </span>
              <p className="min-w-0 flex-1 truncate text-[13px] text-card-foreground">
                {row.videoTitle ?? row.videoId}
              </p>
              <span className="shrink-0 font-mono text-xs text-muted-foreground">
                {row.count}건
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
