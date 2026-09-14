import { estimateCostUsd } from "@/lib/ai/pricing";
import {
  getCategoryDistribution,
  getDailyAnalysisVolume,
  getModelPromptComparison,
  getQualityOverview,
  getRiskLevelDistribution,
} from "@/lib/db/queries/ai-quality";

const RISK_LABELS: Record<string, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

function formatPercent(value: number | null): string {
  if (value === null) return "-";
  return `${(value * 100).toFixed(1)}%`;
}

function formatUsd(value: number): string {
  return `$${value.toFixed(4)}`;
}

export default async function AdminAiQualityPage() {
  const [overview, riskDistribution, categoryDistribution, modelComparison, dailyVolume] =
    await Promise.all([
      getQualityOverview(),
      getRiskLevelDistribution(),
      getCategoryDistribution(),
      getModelPromptComparison(),
      getDailyAnalysisVolume(14),
    ]);

  const modelCosts = modelComparison.map((row) => ({
    ...row,
    costUsd: row.aiModel
      ? estimateCostUsd(row.aiModel, row.promptTokensSum, row.completionTokensSum)
      : null,
  }));
  const hasUnknownPricing = modelCosts.some(
    (row) => row.promptTokensSum + row.completionTokensSum > 0 && row.costUsd === null,
  );
  const totalCostUsd = modelCosts.reduce((sum, row) => sum + (row.costUsd ?? 0), 0);

  // 일별 추이는 현재 MODEL 단가로 근사한다 — 과거에 다른 모델을 썼다면 그
  // 기간은 모델별 비교 표(실제 aiModel 기준)가 더 정확하다
  const currentModelPricingRow = modelComparison.find((r) => r.aiModel)?.aiModel ?? null;

  return (
    <main className="flex flex-1 flex-col gap-6 bg-background px-8 py-10 text-foreground">
      <header>
        <p className="text-xl font-semibold tracking-tight">AI 분석 품질 모니터링</p>
        <p className="text-xs text-muted-foreground">
          채널 구분 없이 시스템 전체 댓글 분석 기준입니다.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-2xl bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">총 분석 건수</p>
          <p className="text-lg font-semibold tracking-tight">
            {overview.totalAnalyzed.toLocaleString()}
          </p>
        </div>
        <div className="rounded-2xl bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">악성 판정</p>
          <p className="text-lg font-semibold tracking-tight">
            {overview.totalMalicious.toLocaleString()}
          </p>
        </div>
        <div className="rounded-2xl bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">검토 필요 큐</p>
          <p className="text-lg font-semibold tracking-tight">
            {overview.needsReview.toLocaleString()}
          </p>
        </div>
        <div className="rounded-2xl bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">오탐 신고율</p>
          <p className="text-lg font-semibold tracking-tight">
            {formatPercent(overview.falsePositiveRate)}
          </p>
        </div>
        <div className="rounded-2xl bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">누적 예상 비용</p>
          <p className="text-lg font-semibold tracking-tight">{formatUsd(totalCostUsd)}</p>
        </div>
        <div className="rounded-2xl bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">토큰 데이터 없는 레거시 건수</p>
          <p className="text-lg font-semibold tracking-tight">
            {overview.legacyWithoutTokenData.toLocaleString()}
          </p>
        </div>
      </section>

      {hasUnknownPricing && (
        <p className="rounded-md bg-risk-high-bg px-3 py-2 text-xs text-risk-high">
          단가 테이블(src/lib/ai/pricing.ts)에 없는 모델의 사용량이 있어 일부 비용이
          누적 예상 비용에서 빠졌습니다.
        </p>
      )}

      <section className="space-y-3 rounded-2xl bg-card px-5 py-4">
        <h2 className="text-sm font-medium text-card-foreground">위험도별 분포</h2>
        <ul className="flex flex-wrap gap-4 text-sm">
          {riskDistribution.map((row) => (
            <li key={row.riskLevel ?? "unknown"} className="text-muted-foreground">
              {RISK_LABELS[row.riskLevel ?? ""] ?? "알 수 없음"}{" "}
              <span className="font-medium text-foreground">{row.count.toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3 rounded-2xl bg-card px-5 py-4">
        <h2 className="text-sm font-medium text-card-foreground">유형별 분포 (상위 10개)</h2>
        <ul className="flex flex-wrap gap-4 text-sm">
          {categoryDistribution.map((row) => (
            <li key={row.category ?? "unknown"} className="text-muted-foreground">
              {row.category ?? "알 수 없음"}{" "}
              <span className="font-medium text-foreground">{row.count.toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3 rounded-2xl bg-card px-5 py-4">
        <h2 className="text-sm font-medium text-card-foreground">모델·프롬프트 버전별 비교</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="px-3 py-2 font-medium">모델</th>
                <th className="px-3 py-2 font-medium">프롬프트</th>
                <th className="px-3 py-2 font-medium">건수</th>
                <th className="px-3 py-2 font-medium">오탐 신고율</th>
                <th className="px-3 py-2 font-medium">예상 비용</th>
              </tr>
            </thead>
            <tbody>
              {modelCosts.map((row) => {
                const reviewed = row.confirmed + row.reportedFalse;
                const rate = reviewed > 0 ? row.reportedFalse / reviewed : null;
                return (
                  <tr
                    key={`${row.aiModel}-${row.promptVersion}`}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-3 py-2">{row.aiModel ?? "-"}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {row.promptVersion ?? "-"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {row.total.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{formatPercent(rate)}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {row.costUsd === null ? "알 수 없음" : formatUsd(row.costUsd)}
                    </td>
                  </tr>
                );
              })}
              {modelCosts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                    분석된 댓글이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl bg-card px-5 py-4">
        <h2 className="text-sm font-medium text-card-foreground">
          최근 14일 일별 분석량
          {currentModelPricingRow && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              (비용은 {currentModelPricingRow} 단가 기준 근사치)
            </span>
          )}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="px-3 py-2 font-medium">날짜</th>
                <th className="px-3 py-2 font-medium">건수</th>
                <th className="px-3 py-2 font-medium">총 토큰</th>
                <th className="px-3 py-2 font-medium">예상 비용</th>
              </tr>
            </thead>
            <tbody>
              {dailyVolume.map((row) => {
                const cost = currentModelPricingRow
                  ? estimateCostUsd(
                      currentModelPricingRow,
                      row.promptTokensSum,
                      row.completionTokensSum,
                    )
                  : null;
                return (
                  <tr key={row.date} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 font-mono text-xs">{row.date}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {row.count.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {(row.promptTokensSum + row.completionTokensSum).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {cost === null ? "-" : formatUsd(cost)}
                    </td>
                  </tr>
                );
              })}
              {dailyVolume.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                    최근 14일 내 분석 이력이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
