"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { RiskBadge } from "@/components/dashboard/risk-badge";
import { Button } from "@/components/ui/button";
import { FilterSelect } from "@/components/ui/filter-select";
import type { CommentRiskLevel } from "@/lib/db/queries/comments";

const RISK_SORT_ORDER: Record<CommentRiskLevel, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

type AuthorComment = {
  id: string;
  text: string;
  riskLevel: CommentRiskLevel | null;
  category: string | null;
  confidence: string | null;
  videoId: string;
  videoTitle: string | null;
  videoType: string | null;
  youtubeCommentId: string;
  createdAt: Date;
};

const RISK_BUBBLE_CLASSES: Record<CommentRiskLevel, string> = {
  high: "bg-risk-high-bg border-risk-high/25",
  medium: "bg-risk-medium-bg border-risk-medium/25",
  low: "bg-risk-low-bg border-risk-low/25",
};

function formatDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
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
}: {
  comments: AuthorComment[];
  displayName: string;
  initial: string;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBlockGuide, setShowBlockGuide] = useState(false);
  const [riskFilter, setRiskFilter] = useState<CommentRiskLevel | "">("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sort, setSort] = useState<"newest" | "risk">("newest");
  const [search, setSearch] = useState("");

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
    const filtered = comments.filter((c) => {
      if (riskFilter && c.riskLevel !== riskFilter) return false;
      if (categoryFilter && c.category !== categoryFilter) return false;
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
  }, [comments, riskFilter, categoryFilter, search, sort]);

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

  function handleExportAll() {
    downloadCsv(comments, `reevely-${safeFileName(displayName)}-전체.csv`);
  }

  function handleExportSelected() {
    const selected = comments.filter((c) => selectedIds.has(c.id));
    downloadCsv(selected, `reevely-${safeFileName(displayName)}-선택.csv`);
  }

  const hasActiveFilters = Boolean(
    riskFilter || categoryFilter || search || sort !== "newest",
  );

  function handleReset() {
    setRiskFilter("");
    setCategoryFilter("");
    setSearch("");
    setSort("newest");
  }

  return (
    <div className="flex flex-col gap-5 lg:pl-8">
      <div className="flex flex-col gap-3">
        <div className="relative w-full">
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

        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect
            value={riskFilter}
            onValueChange={(value) =>
              setRiskFilter(value as CommentRiskLevel | "")
            }
            options={[
              { value: "", label: "위험도 전체" },
              { value: "high", label: "High" },
              { value: "medium", label: "Medium" },
              { value: "low", label: "Low" },
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
              className="ml-2 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              필터 초기화
            </button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          전체 {comments.length}건 중 {filteredComments.length}건 표시 중
        </p>
      </div>

      {filteredComments.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          조건에 맞는 댓글이 없습니다.
        </p>
      )}

      {filteredComments.map((comment) => {
        const commentHref = `https://www.youtube.com/watch?v=${comment.videoId}&lc=${comment.youtubeCommentId}`;
        const videoHref =
          comment.videoType === "shorts"
            ? `https://www.youtube.com/shorts/${comment.videoId}`
            : `https://www.youtube.com/watch?v=${comment.videoId}`;
        const bubbleClass = comment.riskLevel
          ? RISK_BUBBLE_CLASSES[comment.riskLevel]
          : "bg-background/50 border-border";

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
                className={`w-fit max-w-[min(34rem,100%)] rounded-2xl rounded-tl-sm border px-4 py-2.5 ${bubbleClass}`}
              >
                <p className="text-sm leading-relaxed text-card-foreground">
                  {comment.text}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 pl-1 text-xs text-muted-foreground">
                {comment.riskLevel && <RiskBadge riskLevel={comment.riskLevel} />}
                <span className="rounded-full border border-border px-2 py-0.5">
                  {comment.category ?? "미분류"}
                </span>
                <a
                  href={videoHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-primary underline underline-offset-2"
                  title={comment.videoTitle ?? comment.videoId}
                >
                  {comment.videoTitle ?? comment.videoId}
                </a>
                <span>·</span>
                <span className="font-mono">{formatDate(comment.createdAt)}</span>
                <a
                  href={commentHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2"
                >
                  댓글로 이동
                </a>
              </div>
            </div>
          </div>
        );
      })}

      <div className="flex flex-col gap-3 border-t border-border pt-5">
        <div className="flex flex-wrap gap-2.5">
          <Button
            size="lg"
            variant="outline"
            className="px-4"
            onClick={handleExportAll}
          >
            전체 내보내기 (
            <span className="inline-block w-[1ch] text-center tabular-nums">
              {comments.length}
            </span>
            )
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="px-4"
            disabled={selectedIds.size === 0}
            onClick={handleExportSelected}
          >
            선택 내보내기 (
            <span className="inline-block w-[1ch] text-center tabular-nums">
              {selectedIds.size}
            </span>
            )
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="px-4"
            disabled
            title="알림 기능은 아직 준비 중입니다"
          >
            새 댓글 알림 받기
            <span className="ml-1 text-[10px] text-muted-foreground">
              준비 중
            </span>
          </Button>
          <Button
            size="lg"
            variant="outline"
            aria-expanded={showBlockGuide}
            onClick={() => setShowBlockGuide((v) => !v)}
            className="border-risk-high/30 bg-risk-high-bg px-4 text-risk-high hover:bg-risk-high-bg/70 hover:text-risk-high"
          >
            채널 차단 안내 보기
          </Button>
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
    </div>
  );
}
