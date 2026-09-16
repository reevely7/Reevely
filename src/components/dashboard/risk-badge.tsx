const LABELS: Record<string, string> = {
  high: "높음",
  medium: "보통",
  low: "낮음",
};

const CLASSES: Record<string, string> = {
  high: "bg-[#C55556] text-risk-high-foreground",
  medium: "bg-[#EFD3A1] text-risk-medium",
  low: "bg-[#D6EACB] text-risk-low",
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
