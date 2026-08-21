import Link from "next/link";

type AuthorRow = {
  authorChannelId: string;
  authorDisplayName: string | null;
  count: number;
};

export function TopAuthorsCard({
  title,
  rows,
}: {
  title: string;
  rows: AuthorRow[];
}) {
  return (
    <div className="flex h-full flex-col gap-3 rounded-2xl bg-card px-5 py-4">
      <p className="text-sm font-medium text-card-foreground">{title}</p>

      {rows.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          아직 데이터가 충분하지 않습니다.
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {rows.map((row, i) => (
            <Link
              key={row.authorChannelId}
              href={`/authors/${encodeURIComponent(row.authorChannelId)}`}
              className="flex items-center gap-3 py-2.5 hover:text-primary"
            >
              <span className="w-4 shrink-0 font-mono text-xs text-muted-foreground">
                {i + 1}
              </span>
              <p className="min-w-0 flex-1 truncate text-[13px] text-card-foreground">
                {row.authorDisplayName ?? "알 수 없음"}
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
