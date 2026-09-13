"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

type Props = {
  commentId: string;
  channelId: string;
  isArchived: boolean;
};

export function ArchiveActionButton({ commentId, channelId, isArchived }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleClick() {
    setIsLoading(true);
    setError(null);

    const res = await fetch(`/api/comments/${commentId}/archive`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId, archived: !isArchived }),
    });

    if (res.ok) {
      router.refresh();
      return;
    }

    const data = await res.json().catch(() => null);
    setError(data?.error ?? "처리에 실패했습니다.");
    setIsLoading(false);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        variant={isArchived ? "secondary" : "outline"}
        onClick={handleClick}
        disabled={isLoading}
      >
        {isLoading ? "처리 중…" : isArchived ? "보관 해제" : "증거 보관"}
      </Button>
      {error && <p className="max-w-[220px] text-right text-[11px] text-risk-high">{error}</p>}
    </div>
  );
}
