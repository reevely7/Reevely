"use client";

import { useState } from "react";

import { ArchiveActionButton } from "@/components/comments/archive-action-button";
import { RiskBadge } from "@/components/dashboard/risk-badge";
import { InstagramIcon } from "@/components/icons/instagram-icon";
import { YoutubeIcon } from "@/components/icons/youtube-icon";
import { Button } from "@/components/ui/button";

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

function formatDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
}

function videoUrl(
  platform: string,
  videoId: string,
  videoType: string | null,
): string | null {
  if (platform !== "youtube") return null;
  return videoType === "shorts"
    ? `https://www.youtube.com/shorts/${videoId}`
    : `https://www.youtube.com/watch?v=${videoId}`;
}

type Row = {
  id: string;
  text: string;
  authorDisplayName: string | null;
  platform: string;
  videoId: string;
  videoTitle: string | null;
  videoType: string | null;
  riskLevel: string | null;
  category: string | null;
  reason: string | null;
  archivedAt: Date | null;
};

export function EvidenceArchiveList({
  archived,
  channelId,
}: {
  archived: Row[];
  channelId: string;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      {archived.map((comment) => {
        const isExpanded = expandedId === comment.id;
        const link = videoUrl(comment.platform, comment.videoId, comment.videoType);

        return (
          <div
            key={comment.id}
            className="flex flex-col gap-3 rounded-2xl bg-card px-5 py-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  {comment.riskLevel && (
                    <RiskBadge riskLevel={comment.riskLevel} />
                  )}
                  <PlatformIcon platform={comment.platform} />
                  {comment.category && (
                    <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                      {comment.category}
                    </span>
                  )}
                  {comment.archivedAt && (
                    <span className="ml-auto font-mono text-xs text-muted-foreground">
                      보관일 {formatDate(comment.archivedAt)}
                    </span>
                  )}
                </div>

                <p className="text-sm text-card-foreground">
                  {comment.reason ?? comment.text}
                </p>

                <p className="text-xs text-muted-foreground">
                  작성자: {comment.authorDisplayName ?? "알 수 없음"}
                  {" · "}
                  {link ? (
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline underline-offset-2"
                    >
                      {comment.videoTitle ?? "영상 보기"}
                    </a>
                  ) : (
                    (comment.videoTitle ?? comment.videoId)
                  )}
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setExpandedId(isExpanded ? null : comment.id)}
                >
                  미리보기
                </Button>
                <Button size="sm" variant="outline" disabled>
                  PDF 저장 (준비 중)
                </Button>
                <ArchiveActionButton
                  commentId={comment.id}
                  channelId={channelId}
                  isArchived
                  label="삭제"
                />
              </div>
            </div>

            {isExpanded && (
              <div className="rounded-lg border border-border bg-background/50 px-5 py-4">
                <p className="text-sm leading-relaxed text-card-foreground">
                  &ldquo;{comment.text}&rdquo;
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
