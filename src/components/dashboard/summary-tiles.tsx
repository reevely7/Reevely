import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import Link from "next/link";
import { AiOutlineSafetyCertificate } from "react-icons/ai";
import { PiWarningCircle } from "react-icons/pi";
import { TbProgressCheck } from "react-icons/tb";
import { VscComment, VscCommentUnresolved } from "react-icons/vsc";

type WeeklyKpi = { value: number; previous: number };

type DashboardKpis = {
  totalComments: WeeklyKpi;
  needsReview: WeeklyKpi;
  maliciousRate: WeeklyKpi;
  protectedCount: WeeklyKpi;
};

const TILES: Array<{
  key: keyof DashboardKpis;
  label: string;
  suffix: string;
  hrefSuffix: string | null;
  icon: typeof VscCommentUnresolved;
  // 카드 오른쪽 위 큰 장식 아이콘. 생략하면 icon과 동일한 아이콘을 크게 씀
  decorativeIcon?: typeof VscCommentUnresolved;
  iconClassName: string;
}> = [
  {
    key: "totalComments",
    label: "총 댓글",
    suffix: "",
    // 이 숫자는 이번 주 분석 완료된 전체 댓글(악성+정상)인데, /comments 목록은
    // 항상 악성(플래그) 댓글만 보여줘서(getFlaggedComments가 isMalicious=true
    // 고정) 링크를 걸면 숫자와 목록 건수가 안 맞는다. 그래서 이 타일만
    // 클릭 불가능한 정보성 카드로 둔다.
    hrefSuffix: null,
    icon: VscCommentUnresolved,
    decorativeIcon: VscComment,
    iconClassName: "bg-muted text-muted-foreground",
  },
  {
    key: "needsReview",
    label: "검토 필요",
    suffix: "",
    hrefSuffix: "?status=needs_review",
    icon: TbProgressCheck,
    iconClassName: "bg-status-needs-review-bg text-status-needs-review",
  },
  {
    key: "maliciousRate",
    label: "악성 비율",
    suffix: "%",
    hrefSuffix: "",
    icon: PiWarningCircle,
    iconClassName: "bg-risk-high-bg text-risk-high",
  },
  {
    key: "protectedCount",
    label: "보호된 댓글",
    suffix: "",
    hrefSuffix: "",
    icon: AiOutlineSafetyCertificate,
    iconClassName: "bg-status-confirmed-bg text-status-confirmed",
  },
];

function computeTrend(current: number, previous: number) {
  if (previous === 0) {
    return {
      direction: current === 0 ? ("flat" as const) : ("up" as const),
      percent: current === 0 ? 0 : 100,
    };
  }
  const diff = current - previous;
  return {
    direction: diff > 0 ? ("up" as const) : diff < 0 ? ("down" as const) : ("flat" as const),
    percent: Math.round((Math.abs(diff) / previous) * 100),
  };
}

// 사이드바 숫자 배지와 같은 느낌의 pill 스타일 — 방향과 무관하게 항상 같은 톤
const TREND_BADGE_CLASSNAME = "bg-[#DBE6D9] text-[#1E2D26]";

export function SummaryTiles({
  kpis,
  channelId,
}: {
  kpis: DashboardKpis;
  channelId: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
      {TILES.map((tile) => {
        const Icon = tile.icon;
        const DecorativeIcon = tile.decorativeIcon ?? tile.icon;
        const kpi = kpis[tile.key];
        const trend = computeTrend(kpi.value, kpi.previous);
        const TrendIcon =
          trend.direction === "up" ? ArrowUp : trend.direction === "down" ? ArrowDown : Minus;

        const content = (
          <>
            <DecorativeIcon
              aria-hidden
              className="pointer-events-none absolute top-6 right-3 size-14 text-muted-foreground/10"
            />
            <span className="flex items-center gap-2">
              <span
                aria-hidden
                className={`flex size-7 shrink-0 items-center justify-center rounded-full ${tile.iconClassName}`}
              >
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="text-xs text-muted-foreground">{tile.label}</span>
            </span>
            <p className="pl-9 text-3xl font-semibold text-card-foreground">
              {kpi.value.toLocaleString("ko-KR")}
              {tile.suffix}
            </p>
            <span className="flex items-center gap-1.5 pl-9 text-xs">
              <span
                className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 font-medium ${TREND_BADGE_CLASSNAME}`}
              >
                <TrendIcon className="size-3" aria-hidden />
                {trend.percent}%
              </span>
              <span className="text-muted-foreground">지난주 대비</span>
            </span>
          </>
        );

        if (tile.hrefSuffix === null) {
          return (
            <div
              key={tile.key}
              className="relative flex flex-col gap-2 overflow-hidden rounded-lg border border-[#CAD6CF] bg-card px-4 py-4"
            >
              {content}
            </div>
          );
        }

        return (
          <Link
            key={tile.key}
            href={`/c/${channelId}/comments${tile.hrefSuffix}`}
            className="relative flex flex-col gap-2 overflow-hidden rounded-lg border border-[#CAD6CF] bg-card px-4 py-4 transition-colors hover:bg-accent/50"
          >
            {content}
          </Link>
        );
      })}
    </div>
  );
}
