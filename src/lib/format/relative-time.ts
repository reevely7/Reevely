const UNITS: Array<{ ms: number; label: string }> = [
  { ms: 1000 * 60 * 60 * 24, label: "일" },
  { ms: 1000 * 60 * 60, label: "시간" },
  { ms: 1000 * 60, label: "분" },
];

// "12분 전" / "48분 후" — 과거는 "전", 미래는 "후"
export function formatRelativeTime(date: Date, now: Date = new Date()): string {
  const diffMs = date.getTime() - now.getTime();
  const isFuture = diffMs >= 0;
  const absMs = Math.abs(diffMs);

  if (absMs < 60_000) {
    return isFuture ? "곧" : "방금";
  }

  for (const unit of UNITS) {
    if (absMs >= unit.ms) {
      const value = Math.floor(absMs / unit.ms);
      return isFuture ? `${value}${unit.label} 후` : `${value}${unit.label} 전`;
    }
  }

  return isFuture ? "곧" : "방금";
}
