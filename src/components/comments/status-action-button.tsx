"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

type Status = "confirmed" | "reported_false" | "whitelisted";

type Props = {
  commentId: string;
  channelId: string;
  status: Status;
  label: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive";
  icon?: ReactNode;
  className?: string;
};

export function StatusActionButton({
  commentId,
  channelId,
  status,
  label,
  variant = "outline",
  icon,
  className,
}: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleClick() {
    setIsLoading(true);
    const res = await fetch(`/api/comments/${commentId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId, status }),
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
      variant={variant}
      className={className}
      onClick={handleClick}
      disabled={isLoading}
    >
      {!isLoading && icon}
      {isLoading ? "처리 중…" : label}
    </Button>
  );
}
