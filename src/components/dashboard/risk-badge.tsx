import { BarChart3 } from "lucide-react";

const LABELS: Record<string, string> = {
  high: "높음",
  medium: "보통",
  low: "낮음",
};

const CLASSES: Record<string, string> = {
  high: "bg-[#C55556] text-risk-high-foreground",
  medium: "bg-[#F6E29B] text-risk-medium",
  low: "bg-[#D6EACB] text-risk-low",
};

export function RiskBadge({
  riskLevel,
  withIcon = false,
}: {
  riskLevel: string;
  withIcon?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${CLASSES[riskLevel] ?? "bg-muted text-muted-foreground"}`}
    >
      {withIcon && <BarChart3 className="size-3" aria-hidden />}
      {LABELS[riskLevel] ?? riskLevel}
    </span>
  );
}
