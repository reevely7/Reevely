"use client";

import { useState } from "react";

import { StatusActionButton } from "@/components/comments/status-action-button";
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

type Row = {
  id: string;
  text: string;
  authorDisplayName: string | null;
  platform: string;
  riskLevel: string | null;
  category: string | null;
  confidence: string | null;
  reason: string | null;
  createdAt: Date;
};

export function ReviewQueueList({
  queue,
  channelId,
}: {
  queue: Row[];
  channelId: string;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      {queue.map((comment) => {
        const isExpanded = expandedId === comment.id;

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
                  {comment.confidence && (
                    <span className="font-mono text-xs text-muted-foreground">
                      AI 신뢰도 {Math.round(Number(comment.confidence) * 100)}%
                    </span>
                  )}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {formatDate(comment.createdAt)}
                  </span>
                </div>

                <p className="text-sm text-card-foreground">
                  {comment.reason ?? comment.text}
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  {comment.category && (
                    <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                      {comment.category}
                    </span>
                  )}
                  <PlatformIcon platform={comment.platform} />
                </div>
              </div>

              <div className="flex shrink-0 gap-2">
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
                <Button
                  size="sm"
                  variant="ghost"
                  aria-expanded={isExpanded}
                  onClick={() => setExpandedId(isExpanded ? null : comment.id)}
                >
                  상세보기
                </Button>
              </div>
            </div>

            {isExpanded && (
              <div className="rounded-lg border border-border bg-background/50 px-5 py-4">
                <p className="text-sm leading-relaxed text-card-foreground">
                  &ldquo;{comment.text}&rdquo;
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  작성자: {comment.authorDisplayName ?? "알 수 없음"}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
