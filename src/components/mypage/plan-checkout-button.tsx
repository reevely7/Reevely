"use client";

import { loadTossPayments } from "@tosspayments/payment-sdk";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { SubscriptionPlan } from "@/lib/db/queries/subscriptions";

export function PlanCheckoutButton({
  plan,
  userId,
  label,
}: {
  plan: SubscriptionPlan;
  userId: string;
  label: string;
}) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick() {
    setIsLoading(true);
    try {
      const tossPayments = await loadTossPayments(
        process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!,
      );
      await tossPayments.requestBillingAuth("카드", {
        customerKey: userId,
        successUrl: `${window.location.origin}/billing/success?plan=${plan}`,
        failUrl: `${window.location.origin}/billing/fail`,
      });
    } catch {
      // 사용자가 인증창을 직접 닫은 경우 등 — 별도 에러 표시 없이 버튼만 복구
      setIsLoading(false);
    }
  }

  return (
    <Button type="button" onClick={handleClick} disabled={isLoading}>
      {isLoading ? "이동 중…" : label}
    </Button>
  );
}
