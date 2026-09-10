"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function MarkAllReadButton({ channelId }: { channelId: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleClick() {
    setIsLoading(true);
    const res = await fetch("/api/notifications/read-all", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId }),
    });

    if (res.ok) {
      router.refresh();
    } else {
      setIsLoading(false);
    }
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleClick}
      disabled={isLoading}
    >
      {isLoading ? "처리 중…" : "모두 읽음으로 표시"}
    </Button>
  );
}
