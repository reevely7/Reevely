"use client";

import { useMemo, useState } from "react";
import { CircleHelp, Sparkles } from "lucide-react";

import { StatusActionButton } from "@/components/comments/status-action-button";
import { RiskBadge } from "@/components/dashboard/risk-badge";
import { InstagramIcon } from "@/components/icons/instagram-icon";
import { YoutubeIcon } from "@/components/icons/youtube-icon";

const PLATFORM_LABELS: Record<string, string> = {
  youtube: "유튜브",
  instagram: "인스타그램",
};

const PLATFORM_ICONS: Record<string, typeof YoutubeIcon> = {
  youtube: YoutubeIcon,
  instagram: InstagramIcon,
};

function PlatformIcon({ platform }: { platform: string }) {
  const Icon = PLATFORM_ICONS[platform];
  if (!Icon) return null;
  return (
    <span
      className="inline-flex items-center text-muted-foreground"
      title={PLATFORM_LABELS[platform] ?? platform}
    >
      <Icon className="size-4" />
    </span>
  );
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function formatDayLabel(date: Date): string {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${WEEKDAYS[date.getDay()]})`;
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

type Row = {
  id: string;
  text: string;
  authorDisplayName: string | null;
  platform: string;
  riskLevel: string | null;
  category: string | null;
  confidence: string | null;
  reason: string | null;
  uncertaintyReason: string | null;
  createdAt: Date;
};

type RiskLevel = "high" | "medium" | "low";

const RISK_LEVELS: RiskLevel[] = ["high", "medium", "low"];

const RISK_LABELS: Record<RiskLevel, string> = {
  high: "높음",
  medium: "보통",
  low: "낮음",
};

// 점·도넛 차트는 텍스트가 아닌 순수 도형이라, 텍스트용으로 어둡게 낮춘
// risk-medium 대신 밝은 risk-medium-solid를 써야 갈색이 아닌 노랑으로 보인다
const RISK_DOT_CLASS: Record<RiskLevel, string> = {
  high: "bg-risk-high",
  medium: "bg-risk-medium-solid",
  low: "bg-risk-low",
};

// 도넛 차트만 파스텔 톤 사용 — 아래 범례 점(RISK_DOT_CLASS)의 진한 색과는 분리
const RISK_RING_COLOR: Record<RiskLevel, string> = {
  high: "var(--risk-high-pastel)",
  medium: "var(--risk-medium-pastel)",
  low: "var(--risk-low-pastel)",
};

function isRiskLevel(value: string | null): value is RiskLevel {
  return value === "high" || value === "medium" || value === "low";
}

export function ReviewQueueList({
  queue,
  channelId,
}: {
  queue: Row[];
  channelId: string;
}) {
  const [visibleRisks, setVisibleRisks] = useState<Record<RiskLevel, boolean>>({
    high: true,
    medium: true,
    low: true,
  });

  const riskCounts = useMemo(() => {
    const counts: Record<RiskLevel, number> = { high: 0, medium: 0, low: 0 };
    for (const comment of queue) {
      if (isRiskLevel(comment.riskLevel)) counts[comment.riskLevel] += 1;
    }
    return counts;
  }, [queue]);

  const total = queue.length;

  const donutSegments = useMemo(() => {
    const percentages = RISK_LEVELS.map((level) =>
      total > 0 ? (riskCounts[level] / total) * 100 : 0,
    );
    return RISK_LEVELS.map((level, index) => {
      const priorPct = percentages
        .slice(0, index)
        .reduce((sum, pct) => sum + pct, 0);
      // 원 상단(12시 방향)부터 시계 방향으로 채워지도록 25(1/4바퀴) 오프셋에서 시작
      return { level, pct: percentages[index], offset: 25 - priorPct };
    }).filter((segment) => segment.pct > 0);
  }, [riskCounts, total]);

  const dayGroups = useMemo(() => {
    const sorted = [...queue].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
    const groups: { key: string; label: string; items: Row[] }[] = [];
    for (const comment of sorted) {
      const key = dayKey(comment.createdAt);
      const lastGroup = groups.at(-1);
      if (lastGroup?.key === key) {
        lastGroup.items.push(comment);
      } else {
        groups.push({
          key,
          label: formatDayLabel(comment.createdAt),
          items: [comment],
        });
      }
    }
    return groups;
  }, [queue]);

  function toggleRisk(level: RiskLevel) {
    setVisibleRisks((prev) => ({ ...prev, [level]: !prev[level] }));
  }

  const hasVisibleItems = queue.some(
    (comment) =>
      !isRiskLevel(comment.riskLevel) || visibleRisks[comment.riskLevel],
  );

  return (
    <div className="grid grid-cols-1 items-start gap-7 lg:grid-cols-[minmax(0,1fr)_272px]">
      <div className="flex flex-col">
        {!hasVisibleItems && (
          <div className="rounded-2xl bg-card px-6 py-16 text-center text-sm text-muted-foreground">
            선택한 위험도에 해당하는 댓글이 없습니다.
          </div>
        )}
        {dayGroups.map((group) => {
          const visibleItems = group.items.filter(
            (comment) =>
              !isRiskLevel(comment.riskLevel) || visibleRisks[comment.riskLevel],
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.key} className="mb-7 last:mb-0">
              <div className="mb-3 flex items-center gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center">
                  <span
                    className="size-2.5 rounded-full bg-muted-foreground"
                    aria-hidden
                  />
                </span>
                <span className="text-xs font-bold text-muted-foreground">
                  {group.label}
                </span>
              </div>
              <div className="relative isolate flex flex-col gap-3">
                <span
                  className="absolute inset-y-2 left-3 -z-10 w-px -translate-x-1/2 bg-border"
                  aria-hidden
                />
                {visibleItems.map((comment) => {
                  const risk = isRiskLevel(comment.riskLevel)
                    ? comment.riskLevel
                    : null;

                  return (
                    <div key={comment.id} className="flex gap-3">
                      <div className="relative flex w-6 shrink-0 justify-center pt-4">
                        <span
                          className={`size-2.5 rounded-full border-2 border-background ${
                            risk ? RISK_DOT_CLASS[risk] : "bg-muted-foreground"
                          }`}
                          aria-hidden
                        />
                      </div>
                      <div className="min-w-0 flex-1 rounded-2xl bg-card px-5 py-4">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          {risk && <RiskBadge riskLevel={risk} />}
                          <PlatformIcon platform={comment.platform} />
                          <span className="text-xs font-semibold text-card-foreground">
                            {comment.authorDisplayName ?? "알 수 없음"}
                          </span>
                        </div>

                        <p className="mb-2 text-sm leading-relaxed text-card-foreground">
                          {comment.text}
                        </p>

                        {comment.reason && (
                          <div className="mb-2 flex items-start gap-2 rounded-lg bg-accent px-3 py-2">
                            <Sparkles
                              className="mt-0.5 size-3.5 shrink-0 text-primary"
                              aria-hidden
                            />
                            <p className="text-xs leading-relaxed text-accent-foreground">
                              {comment.reason}
                            </p>
                          </div>
                        )}

                        {comment.uncertaintyReason && (
                          <div className="mb-3 flex items-start gap-2 rounded-lg bg-muted px-3 py-2">
                            <CircleHelp
                              className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
                              aria-hidden
                            />
                            <p className="text-xs leading-relaxed text-muted-foreground">
                              {comment.uncertaintyReason}
                            </p>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {comment.category && (
                              <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                                {comment.category}
                              </span>
                            )}
                            {comment.confidence && (
                              <span className="font-mono text-[11px] text-muted-foreground">
                                확신도 {Math.round(Number(comment.confidence) * 100)}%
                              </span>
                            )}
                          </div>
                          <div className="flex shrink-0 gap-1.5">
                            <StatusActionButton
                              commentId={comment.id}
                              channelId={channelId}
                              status="confirmed"
                              label="악성으로 분류"
                              variant="destructive"
                            />
                            <StatusActionButton
                              commentId={comment.id}
                              channelId={channelId}
                              status="whitelisted"
                              label="정상 댓글로 분류"
                              variant="outline"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-2xl bg-card px-5 py-5">
          <h2 className="mb-4 text-xs font-bold tracking-wide text-muted-foreground">
            위험도 요약
          </h2>
          <div className="mb-4 flex items-center gap-4">
            <svg width="60" height="60" viewBox="0 0 36 36" aria-hidden>
              <circle
                cx="18"
                cy="18"
                r="15.9"
                fill="none"
                stroke="var(--muted)"
                strokeWidth="4"
              />
              {donutSegments.map((segment) => (
                <circle
                  key={segment.level}
                  cx="18"
                  cy="18"
                  r="15.9"
                  fill="none"
                  stroke={RISK_RING_COLOR[segment.level]}
                  strokeWidth="4"
                  strokeDasharray={`${segment.pct} ${100 - segment.pct}`}
                  strokeDashoffset={segment.offset}
                  // 구간이 둘 이상이면 round 캡끼리 경계에서 겹쳐 뭉쳐 보이므로,
                  // 링 전체가 한 색(구간 1개)일 때만 둥글게 처리한다
                  strokeLinecap={donutSegments.length > 1 ? "butt" : "round"}
                />
              ))}
            </svg>
            <div>
              <div className="text-xl font-extrabold tabular-nums text-card-foreground">
                {total}
              </div>
              <div className="text-xs text-muted-foreground">검토 대기 중</div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {RISK_LEVELS.map((level) => (
              <div
                key={level}
                className="flex items-center justify-between text-xs font-semibold"
              >
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span
                    className={`size-2 rounded-full ${RISK_DOT_CLASS[level]}`}
                    aria-hidden
                  />
                  {RISK_LABELS[level]}
                </span>
                <span className="tabular-nums text-card-foreground">
                  {riskCounts[level]}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-card px-5 py-5">
          <h2 className="mb-3 text-xs font-bold tracking-wide text-muted-foreground">
            필터
          </h2>
          <div className="flex flex-col gap-1">
            {RISK_LEVELS.map((level) => (
              <label
                key={level}
                className="flex items-center gap-2 py-1.5 text-xs font-semibold text-muted-foreground"
              >
                <input
                  type="checkbox"
                  checked={visibleRisks[level]}
                  onChange={() => toggleRisk(level)}
                  className="size-3.5 accent-primary"
                />
                {RISK_LABELS[level]}
              </label>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
