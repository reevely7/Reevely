// "17:52" — 절대 시각 표시용 (상대 시간이 아니라 정확한 시:분을 보여줘야 할 때)
export function formatClockTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
