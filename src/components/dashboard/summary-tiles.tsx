import { CircleCheck, MessageSquareWarning, Percent, TimerReset } from "lucide-react";
import Link from "next/link";

type DashboardKpis = {
  totalMalicious: number;
  needsReview: number;
  maliciousRate: number;
  protectedCount: number;
};

const TILES: Array<{
  key: keyof DashboardKpis;
  label: string;
  suffix: string;
  hrefSuffix: string;
  icon: typeof MessageSquareWarning;
  iconClassName: string;
}> = [
  {
    key: "totalMalicious",
    label: "총 댓글",
    suffix: "",
    hrefSuffix: "",
    icon: MessageSquareWarning,
    iconClassName: "bg-muted text-muted-foreground",
  },
  {
    key: "needsReview",
    label: "검토 필요",
    suffix: "",
    hrefSuffix: "?status=needs_review",
    icon: TimerReset,
    iconClassName: "bg-status-needs-review-bg text-status-needs-review",
  },
  {
    key: "maliciousRate",
    label: "악성 비율",
    suffix: "%",
    hrefSuffix: "",
    icon: Percent,
    iconClassName: "bg-risk-high-bg text-risk-high",
  },
  {
    key: "protectedCount",
    label: "보호된 댓글",
    suffix: "",
    hrefSuffix: "",
    icon: CircleCheck,
    iconClassName: "bg-status-confirmed-bg text-status-confirmed",
  },
];

export function SummaryTiles({
  kpis,
  channelId,
}: {
  kpis: DashboardKpis;
  channelId: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {TILES.map((tile) => {
        const Icon = tile.icon;
        return (
          <Link
            key={tile.key}
            href={`/c/${channelId}/comments${tile.hrefSuffix}`}
            className="flex flex-col gap-2 rounded-2xl bg-card px-4 py-4 transition-colors hover:bg-accent/50"
          >
            <span
              aria-hidden
              className={`flex size-7 shrink-0 items-center justify-center rounded-full ${tile.iconClassName}`}
            >
              <Icon className="size-3.5" aria-hidden />
            </span>
            <span className="text-xs text-muted-foreground">
              {tile.label}
            </span>
            <p className="text-3xl font-semibold text-card-foreground">
              {kpis[tile.key].toLocaleString("ko-KR")}
              {tile.suffix}
            </p>
          </Link>
        );
      })}
    </div>
  );
}
