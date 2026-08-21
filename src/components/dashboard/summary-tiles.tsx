import Link from "next/link";

type Summary = {
  total: number;
  high: number;
  medium: number;
  low: number;
  needsReview: number;
};

const TILES: Array<{
  key: keyof Summary;
  label: string;
  dotClassName?: string;
  href: string;
}> = [
  { key: "total", label: "전체 플래그", href: "/comments" },
  {
    key: "high",
    label: "High",
    dotClassName: "bg-risk-high",
    href: "/comments?risk=high",
  },
  {
    key: "medium",
    label: "Medium",
    dotClassName: "bg-risk-medium",
    href: "/comments?risk=medium",
  },
  {
    key: "low",
    label: "Low",
    dotClassName: "bg-risk-low",
    href: "/comments?risk=low",
  },
  {
    key: "needsReview",
    label: "검토 필요",
    dotClassName: "bg-status-needs-review",
    href: "/comments?status=needs_review",
  },
];

export function SummaryTiles({ summary }: { summary: Summary }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {TILES.map((tile) => (
        <Link
          key={tile.key}
          href={tile.href}
          className="rounded-2xl bg-card px-4 py-4 transition-colors hover:bg-accent/50"
        >
          <div className="flex items-center gap-1.5">
            {tile.dotClassName && (
              <span
                aria-hidden
                className={`h-2 w-2 shrink-0 rounded-full ${tile.dotClassName}`}
              />
            )}
            <span className="text-xs text-muted-foreground">
              {tile.label}
            </span>
          </div>
          <p className="mt-1 text-3xl font-semibold text-card-foreground">
            {summary[tile.key].toLocaleString("ko-KR")}
          </p>
        </Link>
      ))}
    </div>
  );
}
