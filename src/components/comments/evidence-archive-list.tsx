"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArchiveActionButton } from "@/components/comments/archive-action-button";
import { RiskBadge } from "@/components/dashboard/risk-badge";
import { InstagramIcon } from "@/components/icons/instagram-icon";
import { Button } from "@/components/ui/button";

const PLATFORM_LABELS: Record<string, string> = {
  youtube: "유튜브",
  instagram: "인스타그램",
};

// 댓글목록(comments-table.tsx)과 동일하게 유튜브는 실제 로고 이미지를 쓴다
function PlatformIcon({ platform }: { platform: string }) {
  const label = PLATFORM_LABELS[platform] ?? platform;
  if (platform === "youtube") {
    return (
      <span className="inline-flex items-center" title={label}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/youtube-icon.png" alt="" className="h-4 w-[21px]" />
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

function formatDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
}

function formatDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${formatDate(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// 댓글 딥링크(&lc=)는 유튜브 공식 기능으로, 영상 안에서 그 댓글로 바로
// 스크롤·강조해준다.
function videoUrl(
  platform: string,
  videoId: string,
  videoType: string | null,
  youtubeCommentId: string,
): string | null {
  if (platform !== "youtube") return null;
  const base =
    videoType === "shorts"
      ? `https://www.youtube.com/shorts/${videoId}`
      : `https://www.youtube.com/watch?v=${videoId}`;
  return videoType === "shorts" ? base : `${base}&lc=${youtubeCommentId}`;
}

type Row = {
  id: string;
  text: string;
  authorDisplayName: string | null;
  authorChannelId: string;
  platform: string;
  videoId: string;
  videoTitle: string | null;
  videoType: string | null;
  youtubeCommentId: string;
  riskLevel: string | null;
  category: string | null;
  reason: string | null;
  createdAt: Date;
  archivedAt: Date | null;
  archiveNote: string | null;
};

type HistoryRow = {
  id: string;
  text: string;
  riskLevel: string | null;
  createdAt: Date;
};

type RiskLevel = "high" | "medium" | "low";

const RISK_LEVELS: RiskLevel[] = ["high", "medium", "low"];

const RISK_LABELS: Record<RiskLevel, string> = {
  high: "높음",
  medium: "보통",
  low: "낮음",
};

const RISK_DOT_CLASS: Record<RiskLevel, string> = {
  high: "bg-risk-high",
  // 점처럼 색 면적이 좁은 도형은 배지용으로 어둡게 낮춘 risk-medium을 쓰면
  // 노랑이 갈색으로 보여서, 밝은 solid 톤을 대신 쓴다
  medium: "bg-risk-medium-solid",
  low: "bg-risk-low",
};

function isRiskLevel(value: string | null): value is RiskLevel {
  return value === "high" || value === "medium" || value === "low";
}

export function EvidenceArchiveList({
  archived,
  channelId,
  authorHistory,
}: {
  archived: Row[];
  channelId: string;
  authorHistory: Record<string, HistoryRow[]>;
}) {
  const [riskFilter, setRiskFilter] = useState<RiskLevel | "all">("all");
  const [selectedId, setSelectedId] = useState(archived[0]?.id ?? null);

  const filtered = useMemo(
    () =>
      riskFilter === "all"
        ? archived
        : archived.filter((comment) => comment.riskLevel === riskFilter),
    [archived, riskFilter],
  );

  const selected =
    filtered.find((comment) => comment.id === selectedId) ?? filtered[0] ?? null;

  function selectRiskFilter(level: RiskLevel | "all") {
    setRiskFilter(level);
  }

  return (
    <div className="flex min-h-[70vh] overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex w-[340px] shrink-0 flex-col border-r border-border">
        <div className="flex gap-1.5 border-b border-border p-3">
          <button
            type="button"
            onClick={() => selectRiskFilter("all")}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              riskFilter === "all"
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            전체
          </button>
          {RISK_LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => selectRiskFilter(level)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                riskFilter === level
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {RISK_LABELS[level]}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.map((comment) => {
            const risk = isRiskLevel(comment.riskLevel) ? comment.riskLevel : null;
            const isActive = selected?.id === comment.id;

            return (
              <button
                key={comment.id}
                type="button"
                onClick={() => setSelectedId(comment.id)}
                className={`flex w-full flex-col gap-1 border-b border-border/40 px-4 py-3 text-left transition-colors ${
                  isActive ? "bg-accent" : "hover:bg-muted"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`size-1.5 shrink-0 rounded-full ${
                      risk ? RISK_DOT_CLASS[risk] : "bg-muted-foreground"
                    }`}
                    aria-hidden
                  />
                  <span className="truncate text-xs font-semibold text-card-foreground">
                    {comment.authorDisplayName ?? "알 수 없음"}
                  </span>
                  <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
                    {comment.archivedAt ? formatDate(comment.archivedAt) : ""}
                  </span>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {comment.text}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        {!selected ? (
          <p className="text-sm text-muted-foreground">
            선택한 위험도에 해당하는 증거가 없습니다.
          </p>
        ) : (
          <EvidenceDetail
            key={selected.id}
            comment={selected}
            channelId={channelId}
            history={authorHistory[selected.authorChannelId] ?? []}
          />
        )}
      </div>
    </div>
  );
}

function EvidenceDetail({
  comment,
  channelId,
  history,
}: {
  comment: Row;
  channelId: string;
  history: HistoryRow[];
}) {
  const risk = isRiskLevel(comment.riskLevel) ? comment.riskLevel : null;
  const link = videoUrl(
    comment.platform,
    comment.videoId,
    comment.videoType,
    comment.youtubeCommentId,
  );
  const authorHref = `/c/${channelId}/authors/${encodeURIComponent(comment.authorChannelId)}`;
  const otherComments = history.filter((row) => row.id !== comment.id).slice(0, 4);

  return (
    <div className="flex max-w-4xl flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        {risk && <RiskBadge riskLevel={risk} />}
        <PlatformIcon platform={comment.platform} />
        <Link
          href={authorHref}
          className="text-sm font-semibold text-card-foreground underline-offset-2 hover:underline"
        >
          {comment.authorDisplayName ?? "알 수 없음"}
        </Link>
        <span className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
          <span>작성 시각 {formatDateTime(comment.createdAt)}</span>
          {comment.archivedAt && <span>보관일 {formatDate(comment.archivedAt)}</span>}
        </span>
      </div>

      <div className="rounded-2xl border border-border bg-background/50 px-6 py-5 text-base leading-relaxed text-card-foreground">
        &ldquo;{comment.text}&rdquo;
      </div>

      {comment.reason && (
        <div className="flex items-start gap-2 rounded-lg bg-accent px-4 py-3">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <p className="text-sm leading-relaxed text-accent-foreground">
            {comment.reason}
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {comment.category && (
          <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
            {comment.category}
          </span>
        )}
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            title={comment.videoTitle ?? undefined}
            className="ml-auto min-w-0 max-w-[65%] truncate text-xs text-primary underline underline-offset-2"
          >
            {comment.videoTitle ?? "원본 댓글 보기"}
          </a>
        ) : (
          <span
            title={comment.videoTitle ?? undefined}
            className="ml-auto min-w-0 max-w-[65%] truncate text-xs text-muted-foreground"
          >
            {comment.videoTitle ?? comment.videoId}
          </span>
        )}
      </div>

      {otherComments.length > 0 && (
        <div className="rounded-lg border border-border px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground">
              이 작성자의 다른 댓글
            </p>
            <Link
              href={authorHref}
              className="text-[11px] text-primary underline-offset-2 hover:underline"
            >
              전체 보기
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {otherComments.map((row) => {
              const otherRisk = isRiskLevel(row.riskLevel) ? row.riskLevel : null;
              return (
                <div key={row.id} className="flex items-center gap-2">
                  <span className="w-16 shrink-0 text-[11px] text-muted-foreground">
                    {formatDate(row.createdAt)}
                  </span>
                  {otherRisk && <RiskBadge riskLevel={otherRisk} />}
                  <p className="truncate text-xs text-card-foreground">{row.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <ArchiveNoteEditor
        commentId={comment.id}
        channelId={channelId}
        initialNote={comment.archiveNote}
      />

      <div className="flex flex-wrap gap-2 border-t border-border pt-5">
        <Button size="sm" variant="outline" disabled>
          PDF 저장 (준비 중)
        </Button>
        <ArchiveActionButton
          commentId={comment.id}
          channelId={channelId}
          isArchived
        />
      </div>
    </div>
  );
}

function ArchiveNoteEditor({
  commentId,
  channelId,
  initialNote,
}: {
  commentId: string;
  channelId: string;
  initialNote: string | null;
}) {
  const [note, setNote] = useState(initialNote ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isDirty = note !== (initialNote ?? "");

  // 스크롤 대신 내용에 맞춰 박스 높이 자체가 늘어나도록 매 변경마다 재계산한다
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [note]);

  async function handleSave() {
    setIsSaving(true);
    setError(null);

    const res = await fetch(`/api/comments/${commentId}/archive-note`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId, note }),
    });

    if (res.ok) {
      router.refresh();
      setIsSaving(false);
      return;
    }

    const data = await res.json().catch(() => null);
    setError(data?.error ?? "저장에 실패했습니다.");
    setIsSaving(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold text-muted-foreground">보관 메모</p>
      <textarea
        ref={textareaRef}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="이 증거를 왜 보관했는지, 어떻게 대응할 계획인지 메모해 두세요."
        rows={3}
        maxLength={500}
        className="w-full resize-none overflow-hidden rounded-lg border border-border bg-background px-3 py-2 text-sm text-card-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleSave} disabled={!isDirty || isSaving}>
          {isSaving ? "저장 중…" : "메모 저장"}
        </Button>
        <span className="ml-auto font-mono text-[11px] text-muted-foreground">
          {note.length}/500
        </span>
        {error && <p className="text-[11px] text-risk-high">{error}</p>}
      </div>
    </div>
  );
}
