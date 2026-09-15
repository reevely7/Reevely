import Link from "next/link";

type UsageMetric = {
  label: string;
  used: number;
  limit: number | null; // null = 무제한, 0 = 이 플랜에서 미제공
};

function UsageBar({ label, used, limit }: UsageMetric) {
  if (limit === null) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-medium text-card-foreground">무제한</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-primary/20" />
      </div>
    );
  }

  if (limit === 0) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{label}</span>
          <span className="text-muted-foreground">미제공</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted" />
      </div>
    );
  }

  const percent = Math.min(100, Math.round((used / limit) * 100));
  const barClass =
    percent >= 90 ? "bg-risk-high" : percent >= 70 ? "bg-risk-medium" : "bg-primary";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-card-foreground">
          {used.toLocaleString()} / {limit.toLocaleString()}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${barClass}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export function PlanUsageCard({
  isPro,
  monthlyAnalysis,
  evidenceArchive,
  channels,
  videos,
}: {
  planLabel: string;
  isPro: boolean;
  monthlyAnalysis: UsageMetric;
  evidenceArchive: UsageMetric;
  channels: UsageMetric;
  videos: UsageMetric;
}) {
  return (
    <div className="flex h-full min-h-72 flex-col gap-5 rounded-2xl bg-card px-5 py-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-card-foreground">
          채널 사용량
        </p>
        {!isPro && (
          <Link
            href="/mypage/subscription/plans"
            className="text-xs font-medium text-primary hover:underline"
          >
            플랜 늘리기 →
          </Link>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-center gap-5">
        <UsageBar {...monthlyAnalysis} />
        <UsageBar {...videos} />
        <UsageBar {...evidenceArchive} />
        <UsageBar {...channels} />
      </div>
    </div>
  );
}
