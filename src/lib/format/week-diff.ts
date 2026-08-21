export function formatWeekDiff(thisWeek: number, lastWeek: number): string {
  if (lastWeek === 0) {
    return thisWeek === 0 ? "지난주와 동일" : `${thisWeek}건 증가`;
  }
  const diff = thisWeek - lastWeek;
  if (diff === 0) return "지난주와 동일";
  const percent = Math.round((diff / lastWeek) * 100);
  return `${percent > 0 ? "+" : ""}${percent}%`;
}
