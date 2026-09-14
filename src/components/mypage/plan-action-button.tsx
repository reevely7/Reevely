"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { SubscriptionPlan } from "@/lib/db/queries/subscriptions";

function HighlightList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="flex-1 space-y-2 rounded-xl border border-border px-4 py-3">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <ul className="space-y-1.5 text-sm text-card-foreground">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span className="mt-1.5 size-1 shrink-0 rounded-full bg-current" aria-hidden />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PlanActionButton({
  direction,
  plan,
  planLabel,
  price,
  currentLabel,
  currentPrice,
  targetHighlights,
  currentHighlights,
  nextBillingDateLabel,
  canChargeImmediately,
}: {
  direction: "upgrade" | "downgrade" | "cancel";
  plan?: SubscriptionPlan;
  planLabel: string;
  price: number;
  currentLabel: string;
  currentPrice: number;
  targetHighlights: string[];
  currentHighlights: string[];
  nextBillingDateLabel: string;
  canChargeImmediately: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setIsLoading(true);
    setError(null);

    const res =
      direction === "cancel"
        ? await fetch("/api/billing/cancel", { method: "POST" })
        : await fetch(
            direction === "upgrade" ? "/api/billing/upgrade" : "/api/billing/plan",
            {
              method: direction === "upgrade" ? "POST" : "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ plan }),
            },
          );

    if (res.ok) {
      setOpen(false);
      router.refresh();
    } else {
      const data: { error?: string } = await res.json().catch(() => ({}));
      setError(data.error ?? "요청 처리 중 오류가 발생했습니다.");
    }
    setIsLoading(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <DialogTrigger
        render={
          <Button
            type="button"
            variant={direction === "upgrade" ? "default" : "outline"}
            className="w-full"
            disabled={direction === "upgrade" && !canChargeImmediately}
          >
            변경
          </Button>
        }
      />
      <DialogContent>
        {direction === "upgrade" ? (
          <>
            <DialogHeader>
              <DialogTitle>{planLabel}로 업그레이드</DialogTitle>
              <DialogDescription>
                등록된 카드로 지금 바로 결제되며, 결제 주기가 오늘부터 한 달로
                초기화됩니다.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3 text-sm">
              <span className="text-muted-foreground">
                {currentLabel} · 월 {currentPrice.toLocaleString()}원
              </span>
              <span className="text-muted-foreground">→</span>
              <span className="font-semibold text-card-foreground">
                {planLabel} · 월 {price.toLocaleString()}원
              </span>
            </div>

            <div className="mt-4">
              <HighlightList title={`${planLabel}에서 새로 열리는 것`} items={targetHighlights} />
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              오늘 {price.toLocaleString()}원이 즉시 결제됩니다.
            </p>
          </>
        ) : direction === "downgrade" ? (
          <>
            <DialogHeader>
              <DialogTitle>{planLabel}로 다운그레이드</DialogTitle>
              <DialogDescription>
                지금 결제되는 금액은 없습니다. {nextBillingDateLabel} 다음
                결제일부터 적용됩니다.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <HighlightList title={`지금 (${currentLabel})`} items={currentHighlights} />
              <HighlightList title={`변경 후 (${planLabel})`} items={targetHighlights} />
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>무료로 전환 (구독 해지)</DialogTitle>
              <DialogDescription>
                지금 결제되는 금액은 없습니다. {nextBillingDateLabel}까지는{" "}
                {currentLabel} 혜택을 그대로 이용하고, 그 다음 결제일부터 무료
                플랜으로 전환됩니다.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <HighlightList title={`지금 (${currentLabel})`} items={currentHighlights} />
              <HighlightList title="변경 후 (무료)" items={targetHighlights} />
            </div>
          </>
        )}

        {error && <p className="mt-3 text-xs text-risk-high">{error}</p>}

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={isLoading}
          >
            취소
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={isLoading}>
            {isLoading
              ? "처리 중…"
              : direction === "upgrade"
                ? "결제하고 업그레이드"
                : direction === "downgrade"
                  ? "다운그레이드 예약"
                  : "구독 해지"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
