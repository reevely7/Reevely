"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function CancelSubscriptionButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick() {
    if (!confirm("구독을 해지하시겠습니까? 이미 낸 기간까지는 그대로 이용할 수 있어요.")) {
      return;
    }
    setIsLoading(true);
    const res = await fetch("/api/billing/cancel", { method: "POST" });
    if (res.ok) {
      router.refresh();
    }
    setIsLoading(false);
  }

  return (
    <Button type="button" variant="outline" onClick={handleClick} disabled={isLoading}>
      {isLoading ? "처리 중…" : "구독 해지"}
    </Button>
  );
}
