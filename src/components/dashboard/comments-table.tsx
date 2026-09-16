"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight, Inbox, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { ArchiveActionButton } from "@/components/comments/archive-action-button";
import { BulkActionBar } from "@/components/comments/bulk-action-bar";
import { StatusActionButton } from "@/components/comments/status-action-button";
import { RiskBadge } from "@/components/dashboard/risk-badge";
import { InstagramIcon } from "@/components/icons/instagram-icon";

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
  isArchived: boolean;
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

// confirmed=검토 완료(그린), needs_review=검토 필요(옐로우), reported_false·whitelisted는
// 둘 다 "정상"(그레이)으로 통합 표시한다. isArchived는 이 상태와 별개 축이라 배지를
// 하나 더 붙인다("검토 완료"+"보호됨"을 동시에 가질 수 있음) — ProtectedBadge 참고.
const STATUS_LABELS: Record<string, string> = {
  confirmed: "검토 완료",
  needs_review: "검토 필요",
  reported_false: "정상",
  whitelisted: "정상",
};

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

function ProtectedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
      <ShieldCheck className="size-3" aria-hidden />
      보호됨
    </span>
  );
}

function PlatformIcon({ platform }: { platform: string }) {
  const label = PLATFORM_LABELS[platform] ?? platform;
  if (platform === "youtube") {
    return (
      <span className="inline-flex items-center" title={label}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/youtube-icon.png" alt="" className="relative top-0.5 h-6 w-8" />
      </span>
    );
  }
  if (platform === "instagram") {
    return (
      <span className="inline-flex items-center text-muted-foreground" title={label}>
        <InstagramIcon className="size-4" />
      </span>
    );
  }
  return null;
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

export function CommentsTable({
  rows,
  channelId,
  hideOriginal,
  totalCount,
  maxBulkSelection,
}: {
  rows: Row[];
  channelId: string;
  hideOriginal: boolean;
  totalCount: number;
  maxBulkSelection: number;
}) {
  const searchParams = useSearchParams();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [allFilteredSelected, setAllFilteredSelected] = useState(false);
  const [isSelectingAll, setIsSelectingAll] = useState(false);
  const [selectAllTruncated, setSelectAllTruncated] = useState(false);

  function clearSelection() {
    setSelectedIds(new Set());
    setAllFilteredSelected(false);
    setSelectAllTruncated(false);
  }

  function toggleSelected(id: string) {
    setAllFilteredSelected(false);
    setSelectAllTruncated(false);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function toggleSelectAll() {
    if (allFilteredSelected) {
      clearSelection();
      return;
    }
    await selectAllFiltered();
  }

  async function selectAllFiltered() {
    setIsSelectingAll(true);
    const params = new URLSearchParams(searchParams.toString());
    params.set("channelId", channelId);
    const res = await fetch(`/api/comments/ids?${params.toString()}`);
    if (res.ok) {
      const data = (await res.json()) as { ids: string[]; truncated: boolean };
      setSelectedIds(new Set(data.ids));
      setAllFilteredSelected(true);
      setSelectAllTruncated(data.truncated);
    }
    setIsSelectingAll(false);
  }

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
    <div className="flex flex-col gap-3">
      <BulkActionBar
        channelId={channelId}
        selectedIds={Array.from(selectedIds)}
        onClear={clearSelection}
      />

      {allFilteredSelected && selectAllTruncated && (
        <p className="text-xs text-muted-foreground">
          한 번에 최대 {maxBulkSelection}건까지 선택할 수 있어, 전체{" "}
          {totalCount}건 중 {maxBulkSelection}건만 선택되었습니다.
        </p>
      )}

      <div className="overflow-x-auto rounded-2xl border border-[#CAD6CF] bg-card">
        <table className="w-full min-w-[820px] border-collapse text-left text-[13px]">
          <thead>
            <tr className="border-b border-border bg-[#EEEFF1] text-[13px] text-muted-foreground">
              <th className="w-8 px-4 py-4 font-semibold">
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={toggleSelectAll}
                  disabled={isSelectingAll}
                  aria-label="전체 선택"
                  className="relative top-0.5 size-3.5 accent-primary disabled:opacity-50"
                />
              </th>
              <th className="w-8 px-2 py-4 font-semibold" />
              <th className="px-2 py-4 font-semibold">위험도</th>
              <th className="px-2 py-4 font-semibold whitespace-nowrap">플랫폼</th>
              <th className="px-2 py-4 font-semibold">댓글 내용 또는 AI 요약</th>
              <th className="max-w-[8rem] px-2 py-4 font-semibold">작성자</th>
              <th className="px-2 py-4 font-semibold whitespace-nowrap">유형</th>
              <th className="px-2 py-4 font-semibold whitespace-nowrap">날짜</th>
              <th className="px-2 py-4 font-semibold whitespace-nowrap">상태</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isExpanded = expandedId === row.id;
              const isSelected = selectedIds.has(row.id);
              const previewText = hideOriginal
                ? (row.reason ?? row.text)
                : row.text;

              return (
                <Fragment key={row.id}>
                  <tr
                    onClick={() => setExpandedId(isExpanded ? null : row.id)}
                    className={`cursor-pointer border-b border-border/40 border-l-2 last:border-0 ${isExpanded ? "border-l-primary bg-highlight/10" : "border-l-transparent hover:bg-accent/50"}`}
                  >
                    <td
                      className="px-4 py-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelected(row.id)}
                        aria-label="댓글 선택"
                        className="relative top-0.5 size-3.5 accent-primary"
                      />
                    </td>
                    <td className="px-2 py-3 text-muted-foreground">
                      {isExpanded ? (
                        <ChevronDown className="size-3.5" aria-hidden />
                      ) : (
                        <ChevronRight className="size-3.5" aria-hidden />
                      )}
                    </td>
                    <td className="px-2 py-3">
                      {row.riskLevel && <RiskBadge riskLevel={row.riskLevel} />}
                    </td>
                    <td className="px-2 py-3">
                      <PlatformIcon platform={row.platform} />
                    </td>
                    <td
                      className="max-w-md truncate px-2 py-3 text-card-foreground"
                      title={previewText}
                    >
                      {previewText}
                    </td>
                    <td
                      className="max-w-[8rem] truncate px-2 py-3 text-muted-foreground"
                      title={row.authorDisplayName ?? "알 수 없음"}
                    >
                      {row.authorDisplayName ?? "알 수 없음"}
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-muted-foreground">
                      {row.category ?? "미분류"}
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-muted-foreground">
                      {formatDate(row.createdAt)}
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap">
                      <div className="flex flex-wrap items-center gap-1">
                        <StatusPill status={row.status} />
                        {row.isArchived && <ProtectedBadge />}
                      </div>
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr className="border-b border-border bg-background/40 last:border-0">
                      <td colSpan={9} className="px-4 py-4">
                        <div className="flex flex-col gap-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-2">
                              {row.riskLevel && (
                                <RiskBadge riskLevel={row.riskLevel} />
                              )}
                              <StatusPill status={row.status} />
                              {row.isArchived && <ProtectedBadge />}
                              <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                                {row.category ?? "미분류"}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              {row.status === "reported_false" ? (
                                <span className="text-[11px] text-muted-foreground">
                                  정상 댓글로 분류됨
                                </span>
                              ) : (
                                <StatusActionButton
                                  commentId={row.id}
                                  channelId={channelId}
                                  status="reported_false"
                                  label="정상 댓글로 분류"
                                />
                              )}
                              <ArchiveActionButton
                                commentId={row.id}
                                channelId={channelId}
                                isArchived={row.isArchived}
                              />
                            </div>
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
                              internalHref={`/c/${channelId}/authors/${encodeURIComponent(row.authorChannelId)}`}
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
    </div>
  );
}
