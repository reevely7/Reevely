// "28.4만" — 유튜브 채널 구독자 수를 한국식 만 단위로 표시할 때 쓴다
export function formatSubscriberCount(count: number): string {
  if (count < 10000) {
    return `${count.toLocaleString("ko-KR")}명`;
  }

  const man = Math.round((count / 10000) * 10) / 10;
  const formatted = Number.isInteger(man) ? `${man}` : man.toFixed(1);
  return `${formatted}만`;
}
