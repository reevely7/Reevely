"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function BulkActionBar({
  channelId,
  selectedIds,
  onClear,
}: {
  channelId: string;
  selectedIds: string[];
  onClear: () => void;
}) {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (selectedIds.length === 0) return null;

  async function runBulkStatus(status: "reported_false") {
    setIsLoading(status);
    setError(null);
    const res = await fetch("/api/comments/bulk-status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId, commentIds: selectedIds, status }),
    });
    if (res.ok) {
      onClear();
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "처리에 실패했습니다.");
    }
    setIsLoading(null);
  }

  async function runBulkArchive() {
    setIsLoading("archive");
    setError(null);
    const res = await fetch("/api/comments/bulk-archive", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId, commentIds: selectedIds }),
    });
    if (res.ok) {
      onClear();
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "처리에 실패했습니다.");
    }
    setIsLoading(null);
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-accent px-4 py-3">
      <p className="text-sm font-medium text-accent-foreground">
        {selectedIds.length}건 선택됨
      </p>
      {error && <p className="text-xs text-risk-high">{error}</p>}
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => runBulkStatus("reported_false")}
          disabled={isLoading !== null}
        >
          {isLoading === "reported_false" ? "처리 중…" : "정상 댓글로 분류"}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={runBulkArchive}
          disabled={isLoading !== null}
        >
          {isLoading === "archive" ? "처리 중…" : "증거 보관"}
        </Button>
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          선택 해제
        </button>
      </div>
    </div>
  );
}
