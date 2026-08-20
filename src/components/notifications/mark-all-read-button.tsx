"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function MarkAllReadButton() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleClick() {
    setIsLoading(true);
    const res = await fetch("/api/notifications/read-all", {
      method: "PATCH",
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
