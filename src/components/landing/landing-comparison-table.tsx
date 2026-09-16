import { Check, X } from "lucide-react";

import { EyebrowBadge } from "@/components/landing/eyebrow-badge";
import { PLAN_FEATURES, PLANS } from "@/components/landing/plan-data";

// 랜딩 전용 상세 비교표 — 마이페이지의 PlanComparisonTable(전형적인
// 그린 톤 데이터 테이블)과는 분리된, 이 페이지의 포스터형 톤(라운드
// 2rem, 잉크/라임 배지)에 맞춘 디자인. 네 플랜 모두 동일한 톤으로 두고
// 추천 플랜은 "추천" 배지로만 구분한다.
export function LandingComparisonTable() {
  const lastRow = PLAN_FEATURES.length - 1;

  return (
    <div>
      <div className="mx-auto mb-14 flex max-w-3xl flex-col items-center gap-5 text-center">
        <EyebrowBadge>상세 비교</EyebrowBadge>
        <h3 className="text-[clamp(32px,4.5vw,54px)] leading-[1.12] font-extrabold tracking-[-0.02em] text-[var(--landing-ink)] break-keep">
          필요한 기능을, 한눈에 비교해보세요
        </h3>
        <p className="text-[15px] leading-relaxed text-[#5b6a61] sm:text-base">
          어떤 플랜이 나에게 맞을지 고민되시나요? 주요 기능과 제공 범위를
          한눈에 비교할 수 있습니다.
        </p>
      </div>

      <div className="overflow-x-auto rounded-[2rem] bg-white p-3 ring-1 ring-black/[0.05] sm:p-5">
        <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left">
          <thead>
            <tr>
              <th scope="col" className="px-5 py-5 align-bottom">
                <span className="text-sm font-bold text-[#8a978f]">기능</span>
              </th>
              {PLANS.map((plan) => (
                <th key={plan.name} scope="col" className="px-4 py-5 text-center align-bottom">
                  <span className="flex items-center justify-center gap-2.5">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--landing-ink)] text-[var(--landing-lime)]">
                      <plan.icon className="size-4" />
                    </span>
                    <span className="text-base font-extrabold text-[var(--landing-ink)]">
                      {plan.name}
                    </span>
                  </span>
                  <span className="mt-1.5 block text-xs font-medium text-[#8a978f]">
                    {plan.tableTagline}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PLAN_FEATURES.map((feature, rowIndex) => (
              <tr key={feature.label}>
                <th
                  scope="row"
                  className={`px-5 py-4 ${
                    rowIndex === lastRow ? "" : "border-b border-b-black/[0.05]"
                  }`}
                >
                  <span className="flex items-center gap-2.5 text-sm font-semibold text-[#3d4a43]">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#eef1ee] text-[#5c6b63]">
                      <feature.icon className="size-3.5" />
                    </span>
                    {feature.label}
                  </span>
                </th>
                {feature.values.map((value, index) => (
                  <td
                    key={PLANS[index].name}
                    className={`px-4 py-4 text-center text-[13px] font-medium text-[#3d4a43] ${
                      rowIndex === lastRow ? "" : "border-b border-b-black/[0.05]"
                    }`}
                  >
                    {typeof value === "boolean" ? (
                      value ? (
                        <span className="inline-flex size-5 items-center justify-center rounded-full bg-[var(--landing-lime)]">
                          <Check
                            className="size-3 text-[var(--landing-ink)]"
                            strokeWidth={3}
                          />
                        </span>
                      ) : (
                        <X className="mx-auto size-4 text-[#c7cec9]" />
                      )
                    ) : (
                      value
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
