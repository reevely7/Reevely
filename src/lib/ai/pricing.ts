// USD / 1M 토큰. OpenAI가 가격을 바꾸거나 analyze-comment.ts의 MODEL 상수를
// 바꾸면 같이 갱신할 것. 여기 없는 모델의 사용량은 비용 계산에서 제외된다
// (관리자 AI 품질 대시보드에 "알 수 없음"으로 표시).
export const MODEL_PRICING_PER_1M_TOKENS: Record<
  string,
  { input: number; output: number }
> = {
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
};

export function estimateCostUsd(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number | null {
  const pricing = MODEL_PRICING_PER_1M_TOKENS[model];
  if (!pricing) return null;
  return (
    (promptTokens / 1_000_000) * pricing.input +
    (completionTokens / 1_000_000) * pricing.output
  );
}
