"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { SubscriptionPlan } from "@/lib/db/queries/subscriptions";

export function PlanChangeButton({
  plan,
  label,
}: {
  plan: SubscriptionPlan;
  label: string;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick() {
    setIsLoading(true);
    const res = await fetch("/api/billing/plan", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    if (res.ok) {
      router.refresh();
    }
    setIsLoading(false);
  }

  return (
    <Button type="button" variant="outline" onClick={handleClick} disabled={isLoading}>
      {isLoading ? "처리 중…" : label}
    </Button>
  );
}
