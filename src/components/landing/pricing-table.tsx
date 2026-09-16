import { Check, X } from "lucide-react";

import { EyebrowBadge } from "@/components/landing/eyebrow-badge";
import { PLAN_FEATURES, PLANS } from "@/components/landing/plan-data";

// 랜딩페이지 요금제 섹션의 헤더 + 플랜 카드 4장. 상세 비교표는
// PlanComparisonTable로 분리되어 랜딩·마이페이지에서 각각 붙인다.
// 추천 플랜(플러스)은 딥그린 포스터 카드로 뒤집어 시선을 모은다.
export function PricingTable() {
  return (
    <div>
      <div className="mx-auto mb-14 flex max-w-3xl flex-col items-center gap-5 text-center">
        <EyebrowBadge icon={Check}>크리에이터의 더 안전한 내일을 위해</EyebrowBadge>
        <h2 className="text-[clamp(32px,4.5vw,54px)] leading-[1.12] font-extrabold tracking-[-0.02em] text-[var(--landing-ink)] break-keep">
          채널 규모에 맞게 골라 쓰세요
        </h2>
        <p className="text-[15px] leading-relaxed text-[#5b6a61] sm:text-base">
          어떤 등급이든 AI 판정 정확도는 똑같습니다. 등급별로 달라지는 건
          모니터링 범위와 기능 깊이뿐이에요.
        </p>
      </div>

      <div className="grid items-start gap-5 pt-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={
              plan.recommended
                ? "relative overflow-hidden rounded-[2rem] bg-[var(--landing-forest)] shadow-[0_40px_80px_-40px_rgba(20,33,27,0.6)] transition-transform duration-300 hover:-translate-y-2 lg:-translate-y-4 lg:rotate-[1deg] lg:hover:-translate-y-6 lg:hover:rotate-0"
                : "rounded-[2rem] bg-white ring-1 ring-black/[0.05] transition-transform duration-300 hover:-translate-y-2"
            }
          >
            {plan.recommended && (
              <p className="bg-[var(--landing-lime)] py-2.5 text-center text-[13px] font-extrabold text-[var(--landing-ink)]">
                가장 많이 선택하는 플랜
              </p>
            )}
            <div className="px-7 py-8">
              <div className="flex items-center gap-3.5">
                <span
                  className={`flex size-13 shrink-0 items-center justify-center rounded-2xl ${
                    plan.recommended
                      ? "bg-[var(--landing-lime)] text-[var(--landing-ink)]"
                      : "bg-[var(--landing-ink)] text-[var(--landing-lime)]"
                  }`}
                >
                  <plan.icon className="size-6" />
                </span>
                <p
                  className={`text-[22px] font-extrabold ${
                    plan.recommended ? "text-white" : "text-[var(--landing-ink)]"
                  }`}
                >
                  {plan.name}
                </p>
              </div>

              <p
                className={`mt-4 min-h-12 text-[15px] leading-relaxed break-keep ${
                  plan.recommended ? "text-white/70" : "text-[#5b6a61]"
                }`}
              >
                {plan.tagline}
              </p>

              <div
                className={`mt-4 border-t ${
                  plan.recommended ? "border-white/15" : "border-black/[0.06]"
                }`}
                aria-hidden
              />

              <p className="mt-5">
                <span
                  className={`text-4xl font-extrabold tracking-tight ${
                    plan.recommended ? "text-white" : "text-[var(--landing-ink)]"
                  }`}
                >
                  {plan.price}
                </span>
                <span
                  className={`text-sm font-medium ${
                    plan.recommended ? "text-white/60" : "text-[#71806f]"
                  }`}
                >
                  {" "}
                  / 월
                </span>
              </p>

              <ul className="mt-6 space-y-3.5">
                {plan.highlights.map((highlight) => (
                  <li key={highlight} className="flex items-start gap-2.5">
                    <span
                      className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ${
                        plan.recommended
                          ? "bg-[var(--landing-lime)]"
                          : "bg-[var(--landing-ink)]"
                      }`}
                    >
                      <Check
                        className={`size-3 ${
                          plan.recommended
                            ? "text-[var(--landing-ink)]"
                            : "text-[var(--landing-lime)]"
                        }`}
                        strokeWidth={3}
                      />
                    </span>
                    <span
                      className={`text-sm font-medium ${
                        plan.recommended ? "text-white/85" : "text-[#3d4a43]"
                      }`}
                    >
                      {highlight}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 상세 비교표 — 마이페이지 플랜 변경 화면에서 쓴다. 랜딩 전용 디자인은
// LandingComparisonTable로 분리되어 있다.
export function PlanComparisonTable() {
  const lastRow = PLAN_FEATURES.length - 1;

  return (
    <div>
      <div className="mb-6 text-center">
        <EyebrowBadge>상세 비교</EyebrowBadge>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-black/[0.06] bg-white p-2 shadow-sm sm:p-4">
        <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left">
          <thead>
            <tr>
              <th scope="col" className="border-b border-b-black/[0.06] px-5 py-5 align-middle">
                <span className="text-sm font-bold text-[#16241d]">기능</span>
              </th>
              {PLANS.map((plan) => (
                <th
                  key={plan.name}
                  scope="col"
                  className={`border-b border-b-black/[0.06] px-4 py-5 text-center align-middle ${
                    plan.recommended
                      ? "rounded-t-2xl border-x-2 border-t-2 border-x-primary/60 border-t-primary/60 bg-[#f3faf4]"
                      : ""
                  }`}
                >
                  <span className="inline-flex items-center justify-center gap-1.5">
                    <span
                      className={`text-base font-extrabold ${plan.nameClass ?? "text-[#16241d]"}`}
                    >
                      {plan.name}
                    </span>
                    {plan.recommended && (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] leading-none font-semibold text-white">
                        추천
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block text-xs font-medium text-[#71806f]">
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
                    className={`px-5 py-4 ${rowIndex === lastRow ? "" : "border-b border-b-black/[0.05]"}`}
                >
                  <span className="flex items-center gap-2.5 text-sm font-semibold text-[#3d4a43]">
                    <feature.icon className="size-4 shrink-0 text-primary" />
                    {feature.label}
                  </span>
                </th>
                {feature.values.map((value, index) => {
                  const recommended = PLANS[index].recommended;
                  return (
                    <td
                      key={PLANS[index].name}
                      className={`px-4 py-4 text-center text-[13px] ${
                        rowIndex === lastRow
                          ? ""
                          : "border-b border-b-black/[0.05]"
                      } ${
                        recommended
                          ? `border-x-2 border-x-primary/60 bg-[#f3faf4] font-bold text-primary ${
                              rowIndex === lastRow
                                ? "rounded-b-2xl border-b-2 border-b-primary/60"
                                : ""
                            }`
                          : "font-medium text-[#3d4a43]"
                      }`}
                    >
                      {typeof value === "boolean" ? (
                        value ? (
                          <Check
                            className="mx-auto size-4 text-primary"
                            strokeWidth={2.5}
                          />
                        ) : (
                          <X className="mx-auto size-4 text-[#b9c2bb]" />
                        )
                      ) : (
                        value
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
