import "server-only";

// 외부 라이브러리 없이 동시 실행 개수를 제한하는 worker pool. 유튜브/OpenAI
// 호출을 무제한 Promise.all로 한꺼번에 보내면 봇 탐지·레이트리밋에 걸리기
// 쉬워, sync/분석/cron 파이프라인 전반에서 이 헬퍼로 동시성을 제한한다.
export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const current = nextIndex++;
      results[current] = await fn(items[current]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, worker),
  );

  return results;
}
