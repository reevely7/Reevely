"use client";

import {
  AlertCircle,
  Bell,
  ChevronLeft,
  ChevronRight,
  Clock,
  Play,
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";

import { DateRangeFilter } from "@/components/dashboard/date-range-filter";
import { RiskBadge } from "@/components/dashboard/risk-badge";
import { FilterSelect } from "@/components/ui/filter-select";
import type { CommentRiskLevel } from "@/lib/db/queries/comments";

const RISK_SORT_ORDER: Record<CommentRiskLevel, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const PAGE_SIZE = 20;

type AuthorComment = {
  id: string;
  text: string;
  isMalicious: boolean | null;
  riskLevel: CommentRiskLevel | null;
  category: string | null;
  confidence: string | null;
  status: string;
  platform: string;
  videoId: string;
  videoTitle: string | null;
  videoType: string | null;
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

const STATUS_LABELS: Record<string, string> = {
  confirmed: "확정",
  needs_review: "검토 필요",
  reported_false: "오탐 신고됨",
  whitelisted: "화이트리스트",
};

const RISK_BUBBLE_CLASSES: Record<CommentRiskLevel, string> = {
  high: "bg-risk-high-bg",
  medium: "bg-risk-medium-bg",
  low: "bg-risk-low-bg",
};

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function formatDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
}

function formatDateTimeWithWeekday(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const weekday = WEEKDAY_LABELS[date.getDay()];
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} (${weekday}) ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function truncateTitle(title: string, max = 25): string {
  return title.length > max ? `${title.slice(0, max)}...` : title;
}

function safeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "").trim() || "author";
}

function downloadCsv(rows: AuthorComment[], filename: string) {
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const header = ["날짜", "위험도", "유형", "확신도", "영상", "댓글"];
  const lines = [header.map(escape).join(",")];

  for (const row of rows) {
    lines.push(
      [
        formatDate(row.createdAt),
        row.riskLevel ?? "",
        row.category ?? "미분류",
        row.confidence ? `${Math.round(Number(row.confidence) * 100)}%` : "",
        row.videoTitle ?? row.videoId,
        row.text,
      ]
        .map((value) => escape(String(value)))
        .join(","),
    );
  }

  // 엑셀에서 한글이 깨지지 않도록 UTF-8 BOM을 붙인다
  const blob = new Blob(["﻿" + lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function AuthorCommentFeed({
  comments,
  displayName,
  initial,
  channelId,
  authorChannelId,
  initialSubscribed,
}: {
  comments: AuthorComment[];
  displayName: string;
  initial: string;
  channelId: string;
  authorChannelId: string;
  initialSubscribed: boolean;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBlockGuide, setShowBlockGuide] = useState(false);
  const [commentScope, setCommentScope] = useState<"all" | "malicious">(
    "all",
  );
  const [riskFilter, setRiskFilter] = useState<CommentRiskLevel | "">("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState<"newest" | "risk">("newest");
  const [search, setSearch] = useState("");
  const [subscribed, setSubscribed] = useState(initialSubscribed);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [page, setPage] = useState(1);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          comments
            .map((c) => c.category)
            .filter((c): c is string => c !== null),
        ),
      ),
    [comments],
  );

  const filteredComments = useMemo(() => {
    const query = search.trim().toLowerCase();
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const to = dateTo ? new Date(`${dateTo}T23:59:59.999`) : null;
    const filtered = comments.filter((c) => {
      if (commentScope === "malicious" && !c.isMalicious) return false;
      if (riskFilter && c.riskLevel !== riskFilter) return false;
      if (categoryFilter && c.category !== categoryFilter) return false;
      if (statusFilter && c.status !== statusFilter) return false;
      if (from && c.createdAt < from) return false;
      if (to && c.createdAt > to) return false;
      if (query && !c.text.toLowerCase().includes(query)) return false;
      return true;
    });

    if (sort === "risk") {
      return [...filtered].sort((a, b) => {
        const ra = a.riskLevel ? RISK_SORT_ORDER[a.riskLevel] : 3;
        const rb = b.riskLevel ? RISK_SORT_ORDER[b.riskLevel] : 3;
        return ra !== rb ? ra - rb : b.createdAt.getTime() - a.createdAt.getTime();
      });
    }
    return filtered;
  }, [
    comments,
    commentScope,
    riskFilter,
    categoryFilter,
    statusFilter,
    dateFrom,
    dateTo,
    search,
    sort,
  ]);

  // 필터/검색 조건이 바뀌면 걸러진 결과가 통째로 달라지므로 페이지를 1로
  // 되돌린다 (useEffect 대신 렌더 중 비교 — CommentSearch의 URL 동기화와 동일 패턴)
  const [syncedFilteredComments, setSyncedFilteredComments] =
    useState(filteredComments);
  if (filteredComments !== syncedFilteredComments) {
    setSyncedFilteredComments(filteredComments);
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(filteredComments.length / PAGE_SIZE));
  const pagedComments = filteredComments.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const allFilteredSelected =
    filteredComments.length > 0 &&
    filteredComments.every((c) => selectedIds.has(c.id));

  function toggleSelectAll() {
    setSelectedIds(
      allFilteredSelected
        ? new Set()
        : new Set(filteredComments.map((c) => c.id)),
    );
  }

  function handleExportAll() {
    downloadCsv(comments, `reevely-${safeFileName(displayName)}-전체.csv`);
  }

  function handleExportSelected() {
    const selected = comments.filter((c) => selectedIds.has(c.id));
    downloadCsv(selected, `reevely-${safeFileName(displayName)}-선택.csv`);
  }

  async function handleToggleSubscribe() {
    setIsSubscribing(true);
    const nextSubscribed = !subscribed;
    const res = await fetch(
      `/api/authors/${encodeURIComponent(authorChannelId)}/subscription`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId,
          subscribed: nextSubscribed,
          authorDisplayName: displayName,
        }),
      },
    );
    if (res.ok) {
      setSubscribed(nextSubscribed);
    }
    setIsSubscribing(false);
  }

  const hasActiveFilters = Boolean(
    riskFilter ||
      categoryFilter ||
      statusFilter ||
      dateFrom ||
      dateTo ||
      search ||
      sort !== "newest",
  );

  function handleReset() {
    setRiskFilter("");
    setCategoryFilter("");
    setStatusFilter("");
    setDateFrom("");
    setDateTo("");
    setSearch("");
    setSort("newest");
  }

  return (
    <div className="flex flex-col gap-5 lg:pl-8">
      <div className="flex flex-col gap-3">
        <div className="inline-flex w-fit shrink-0 rounded-full border border-border bg-background p-1">
          <button
            type="button"
            onClick={() => setCommentScope("all")}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              commentScope === "all"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            전체 댓글 보기
          </button>
          <button
            type="button"
            onClick={() => setCommentScope("malicious")}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              commentScope === "malicious"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            악성 댓글만 보기
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect
            value={riskFilter}
            onValueChange={(value) =>
              setRiskFilter(value as CommentRiskLevel | "")
            }
            options={[
              { value: "", label: "위험도 전체" },
              { value: "high", label: "높음" },
              { value: "medium", label: "보통" },
              { value: "low", label: "낮음" },
            ]}
          />

          <FilterSelect
            value={categoryFilter}
            onValueChange={setCategoryFilter}
            options={[
              { value: "", label: "유형 전체" },
              ...categories.map((category) => ({
                value: category,
                label: category,
              })),
            ]}
          />

          <FilterSelect
            value={statusFilter}
            onValueChange={setStatusFilter}
            options={[
              { value: "", label: "상태 전체" },
              ...Object.entries(STATUS_LABELS).map(([value, label]) => ({
                value,
                label,
              })),
            ]}
          />

          <DateRangeFilter
            dateFrom={dateFrom}
            dateTo={dateTo}
            onChange={(from, to) => {
              setDateFrom(from);
              setDateTo(to);
            }}
          />

          <FilterSelect
            value={sort}
            onValueChange={(value) => setSort(value as "newest" | "risk")}
            options={[
              { value: "newest", label: "최신순" },
              { value: "risk", label: "위험도순" },
            ]}
          />

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              필터 초기화
            </button>
          )}

          <div className="relative ml-auto w-full max-w-xs">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="댓글 내용 검색"
              className="h-10 w-full rounded-md border border-border bg-background py-2 pr-3 pl-10 text-base text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          전체 {comments.length}건 중 {filteredComments.length}건 표시 중
        </p>
      </div>

      <div className="flex flex-col gap-3 border-b border-border pb-5">
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={handleToggleSubscribe}
            disabled={isSubscribing}
            className="flex items-center gap-2 rounded-full border border-primary/30 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 disabled:opacity-60"
          >
            <Bell className="size-4" aria-hidden />
            {isSubscribing
              ? "처리 중…"
              : subscribed
                ? "알림 받는 중"
                : "새 댓글 알림 받기"}
          </button>

          <button
            type="button"
            onClick={handleExportAll}
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            전체 내보내기 ({comments.length})
          </button>

          <button
            type="button"
            onClick={handleExportSelected}
            disabled={selectedIds.size === 0}
            className={`text-sm font-medium transition-colors ${
              selectedIds.size === 0
                ? "cursor-not-allowed text-muted-foreground/50"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            선택 내보내기 ({selectedIds.size})
          </button>

          <button
            type="button"
            aria-expanded={showBlockGuide}
            aria-label="채널 차단 안내 보기"
            title="채널 차단 안내 보기"
            onClick={() => setShowBlockGuide((v) => !v)}
            className="ml-auto flex size-9 shrink-0 items-center justify-center rounded-full bg-risk-high-bg text-risk-high transition-colors hover:bg-risk-high-bg/70"
          >
            <AlertCircle className="size-4" aria-hidden />
          </button>
        </div>

        {showBlockGuide && (
          <div className="rounded-lg border border-border bg-background/50 px-4 py-3 text-[13px] leading-relaxed text-muted-foreground">
            YouTube 스튜디오 → 댓글 관리에서 이 작성자의 댓글 옆 점 3개
            메뉴를 열고 &quot;사용자를 채널에서 숨기기&quot;를 선택하면 이후
            이 작성자의 댓글이 내 채널에 보이지 않게 됩니다. Reevely에서는
            계속 기록이 조회됩니다.
          </div>
        )}
      </div>

      {filteredComments.length > 0 && (
        <label className="flex w-fit cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground">
          <input
            type="checkbox"
            checked={allFilteredSelected}
            onChange={toggleSelectAll}
            aria-label="전체 선택"
            className="size-4 shrink-0 cursor-pointer appearance-none rounded border-2 border-muted-foreground/50 bg-transparent transition-colors checked:border-primary checked:bg-primary"
          />
          전체 선택
          {selectedIds.size > 0 && <span>· {selectedIds.size}건 선택됨</span>}
        </label>
      )}

      {filteredComments.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          조건에 맞는 댓글이 없습니다.
        </p>
      )}

      {pagedComments.map((comment) => {
        const commentHref = `https://www.youtube.com/watch?v=${comment.videoId}&lc=${comment.youtubeCommentId}`;
        const videoHref =
          comment.videoType === "shorts"
            ? `https://www.youtube.com/shorts/${comment.videoId}`
            : `https://www.youtube.com/watch?v=${comment.videoId}`;
        const bubbleClass = comment.riskLevel
          ? RISK_BUBBLE_CLASSES[comment.riskLevel]
          : "bg-background/50";

        return (
          <div key={comment.id} className="flex gap-2.5">
            <input
              type="checkbox"
              checked={selectedIds.has(comment.id)}
              onChange={() => toggleSelected(comment.id)}
              aria-label="댓글 선택"
              className="mt-3 size-4 shrink-0 cursor-pointer appearance-none rounded border-2 border-muted-foreground/50 bg-transparent transition-colors checked:border-primary checked:bg-primary"
            />
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-gradient-to-br from-secondary to-background text-xs font-semibold text-primary">
              {initial}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div
                className={`w-fit max-w-[min(50rem,100%)] rounded-2xl rounded-tl-sm px-4 py-2.5 ${bubbleClass}`}
              >
                <p className="text-sm leading-relaxed text-card-foreground">
                  {comment.text}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 pl-1 text-xs text-muted-foreground">
                <Clock className="size-3.5" aria-hidden />
                <span className="font-mono">
                  {formatDateTimeWithWeekday(comment.createdAt)}
                </span>
                <span className="text-border">|</span>
                {comment.riskLevel && (
                  <RiskBadge riskLevel={comment.riskLevel} withIcon />
                )}
                <span className="rounded-full border border-border px-2 py-0.5">
                  {comment.category ?? "미분류"}
                </span>
                <span className="rounded-full border border-border px-2 py-0.5">
                  {PLATFORM_LABELS[comment.platform] ?? comment.platform}
                </span>
                {comment.videoType && (
                  <span className="rounded-full border border-border px-2 py-0.5">
                    {VIDEO_TYPE_LABELS[comment.videoType] ?? comment.videoType}
                  </span>
                )}
                <a
                  href={videoHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-muted-foreground"
                  title={comment.videoTitle ?? comment.videoId}
                >
                  <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
                    <Play className="size-2.5" fill="currentColor" aria-hidden />
                  </span>
                  {truncateTitle(comment.videoTitle ?? comment.videoId)}
                </a>
                <a
                  href={commentHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-0.5 rounded-full border border-border px-2.5 py-1 text-muted-foreground transition-colors hover:text-foreground"
                >
                  댓글
                  <ChevronRight className="size-3.5" aria-hidden />
                </a>
              </div>
            </div>
          </div>
        );
      })}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 border-t border-border pt-5">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="size-4" aria-hidden />
            이전
          </button>
          <span className="px-2 text-sm text-muted-foreground tabular-nums">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            다음
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
