const LABELS: Record<string, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

const CLASSES: Record<string, string> = {
  high: "bg-risk-high-bg text-risk-high",
  medium: "bg-risk-medium-bg text-risk-medium",
  low: "bg-risk-low-bg text-risk-low",
};

export function RiskBadge({ riskLevel }: { riskLevel: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${CLASSES[riskLevel] ?? "bg-muted text-muted-foreground"}`}
    >
      {LABELS[riskLevel] ?? riskLevel}
    </span>
  );
}
