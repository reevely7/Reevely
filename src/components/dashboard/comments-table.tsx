"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight, Inbox } from "lucide-react";
import Link from "next/link";

import { StatusActionButton } from "@/components/comments/status-action-button";
import { RiskBadge } from "@/components/dashboard/risk-badge";

type Row = {
  id: string;
  text: string;
  authorDisplayName: string | null;
  authorChannelId: string;
  platform: string;
  videoTitle: string | null;
  videoType: string | null;
  riskLevel: string | null;
  category: string | null;
  confidence: string | null;
  reason: string | null;
  status: string;
  videoId: string;
  youtubeCommentId: string;
  createdAt: Date;
};

const PLATFORM_LABELS: Record<string, string> = {
  youtube: "유튜브",
  instagram: "인스타그램",
};

const VIDEO_TYPE_LABELS: Record<string, string> = {
  video: "동영상",
  shorts: "쇼츠",
};

function formatDetectedAt(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
}

const STATUS_LABELS: Record<string, string> = {
  confirmed: "확정",
  needs_review: "검토 필요",
  reported_false: "오탐 신고됨",
  whitelisted: "화이트리스트",
};

// "확정"은 블루(status-confirmed), "검토 필요"는 퍼플(status-needs-review)로 분리해
// 골드(primary)·주황골드(risk-medium)와도, 서로와도 헷갈리지 않게 한다.
const STATUS_PILL_CLASSES: Record<string, string> = {
  confirmed: "bg-status-confirmed-bg text-status-confirmed",
  needs_review: "bg-status-needs-review-bg text-status-needs-review",
  reported_false: "bg-muted text-muted-foreground",
  whitelisted: "bg-muted text-muted-foreground",
};

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_PILL_CLASSES[status] ?? "bg-muted text-muted-foreground"}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function InfoTile({
  label,
  value,
  href,
  internalHref,
  span,
}: {
  label: string;
  value: string;
  href?: string;
  internalHref?: string;
  span?: string;
}) {
  const linkClassName =
    "block truncate text-[13px] font-medium text-primary underline underline-offset-2";

  return (
    <div
      className={`rounded-lg border border-border bg-background/50 px-3 py-2 ${span ?? ""}`}
    >
      <p className="text-[10px] tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      {internalHref ? (
        <Link href={internalHref} className={linkClassName} title={value}>
          {value}
        </Link>
      ) : href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClassName}
          title={value}
        >
          {value}
        </a>
      ) : (
        <p
          className="truncate text-[13px] font-medium text-card-foreground"
          title={value}
        >
          {value}
        </p>
      )}
    </div>
  );
}

export function CommentsTable({ rows }: { rows: Row[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl bg-card px-6 py-16 text-center">
        <Inbox className="size-8 text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">
          조건에 맞는 댓글이 없습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl bg-card">
      <table className="w-full min-w-[720px] border-collapse text-left text-[13px]">
        <thead>
          <tr className="border-b border-border text-[11px] text-muted-foreground">
            <th className="w-8 px-4 py-3 font-medium" />
            <th className="px-2 py-3 font-medium">위험도</th>
            <th className="px-2 py-3 font-medium">댓글</th>
            <th className="px-2 py-3 font-medium">유형</th>
            <th className="px-2 py-3 font-medium">날짜</th>
            <th className="px-2 py-3 font-medium">상태</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isExpanded = expandedId === row.id;

            return (
              <Fragment key={row.id}>
                <tr
                  onClick={() => setExpandedId(isExpanded ? null : row.id)}
                  className={`cursor-pointer border-b border-border border-l-2 last:border-0 ${isExpanded ? "border-l-primary bg-highlight/10" : "border-l-transparent hover:bg-accent/50"}`}
                >
                  <td className="px-4 py-3 text-muted-foreground">
                    {isExpanded ? (
                      <ChevronDown className="size-3.5" aria-hidden />
                    ) : (
                      <ChevronRight className="size-3.5" aria-hidden />
                    )}
                  </td>
                  <td className="px-2 py-3">
                    {row.riskLevel && <RiskBadge riskLevel={row.riskLevel} />}
                  </td>
                  <td
                    className="max-w-xs truncate px-2 py-3 text-card-foreground"
                    title={row.text}
                  >
                    {row.text}
                  </td>
                  <td className="px-2 py-3 text-muted-foreground">
                    {row.category ?? "미분류"}
                  </td>
                  <td className="px-2 py-3 text-muted-foreground">
                    {formatDate(row.createdAt)}
                  </td>
                  <td className="px-2 py-3 text-muted-foreground">
                    {STATUS_LABELS[row.status] ?? row.status}
                  </td>
                </tr>

                {isExpanded && (
                  <tr className="border-b border-border bg-background/40 last:border-0">
                    <td colSpan={6} className="px-4 py-4">
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            {row.riskLevel && (
                              <RiskBadge riskLevel={row.riskLevel} />
                            )}
                            <StatusPill status={row.status} />
                            <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                              {row.category ?? "미분류"}
                            </span>
                          </div>

                          {row.status === "reported_false" ? (
                            <span className="text-[11px] text-muted-foreground">
                              오탐 신고됨
                            </span>
                          ) : (
                            <StatusActionButton
                              commentId={row.id}
                              status="reported_false"
                              label="오탐 신고"
                            />
                          )}
                        </div>

                        <div className="rounded-lg border border-border bg-background/50 px-5 py-4">
                          <p className="text-sm leading-relaxed text-card-foreground">
                            “{row.text}”
                          </p>
                          {row.reason && (
                            <p className="mt-2 text-[13px] text-muted-foreground">
                              <span className="text-primary/80">
                                AI 판정 근거·
                              </span>
                              {row.reason}
                            </p>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          {row.platform === "youtube" && row.videoTitle && (
                            <InfoTile
                              label="영상 제목"
                              value={row.videoTitle}
                              href={
                                row.videoType === "shorts"
                                  ? `https://www.youtube.com/shorts/${row.videoId}`
                                  : `https://www.youtube.com/watch?v=${row.videoId}`
                              }
                              span="col-span-2"
                            />
                          )}
                          <InfoTile
                            label="댓글"
                            value="댓글로 이동"
                            href={`https://www.youtube.com/watch?v=${row.videoId}&lc=${row.youtubeCommentId}`}
                          />
                          <InfoTile
                            label="작성자"
                            value={row.authorDisplayName ?? "알 수 없음"}
                            internalHref={`/authors/${encodeURIComponent(row.authorChannelId)}`}
                          />
                          <InfoTile
                            label="플랫폼"
                            value={PLATFORM_LABELS[row.platform] ?? row.platform}
                          />
                          {row.platform === "youtube" && row.videoType && (
                            <InfoTile
                              label="콘텐츠 형식"
                              value={
                                VIDEO_TYPE_LABELS[row.videoType] ??
                                row.videoType
                              }
                            />
                          )}
                          <InfoTile
                            label="탐지 시각"
                            value={formatDetectedAt(row.createdAt)}
                          />
                          <InfoTile
                            label="AI 확신도"
                            value={
                              row.confidence
                                ? `${Math.round(Number(row.confidence) * 100)}%`
                                : "-"
                            }
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
