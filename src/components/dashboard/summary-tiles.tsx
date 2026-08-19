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
}> = [
  { key: "total", label: "전체 플래그" },
  { key: "high", label: "High", dotClassName: "bg-risk-high" },
  { key: "medium", label: "Medium", dotClassName: "bg-risk-medium" },
  { key: "low", label: "Low", dotClassName: "bg-risk-low" },
  { key: "needsReview", label: "검토 필요", dotClassName: "bg-primary" },
];

export function SummaryTiles({ summary }: { summary: Summary }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {TILES.map((tile) => (
        <div
          key={tile.key}
          className="rounded-2xl bg-card px-4 py-4"
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
        </div>
      ))}
    </div>
  );
}
