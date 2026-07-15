"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

type Status = "confirmed" | "reported_false" | "whitelisted";

type Props = {
  commentId: string;
  status: Status;
  label: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
};

export function StatusActionButton({
  commentId,
  status,
  label,
  variant = "outline",
}: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleClick() {
    setIsLoading(true);
    const res = await fetch(`/api/comments/${commentId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
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
      onClick={handleClick}
      disabled={isLoading}
    >
      {isLoading ? "처리 중…" : label}
    </Button>
  );
}
