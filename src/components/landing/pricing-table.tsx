import { Check, X } from "lucide-react";

import { FREE_PLAN_HIGHLIGHTS, PLAN_HIGHLIGHTS } from "@/lib/billing/plan-copy";

type PlanFeatureValue = string | boolean;

type Plan = {
  name: string;
  tagline: string;
  price: string;
  highlights: string[];
  recommended?: boolean;
};

const PLANS: Plan[] = [
  {
    name: "무료",
    tagline: "일단 지켜보고 있다는 확신이 필요할 때",
    price: "0원",
    highlights: FREE_PLAN_HIGHLIGHTS,
  },
  {
    name: "베이직",
    tagline: "혼자 채널을 운영하는 크리에이터의 기본기",
    price: "19,900원",
    highlights: PLAN_HIGHLIGHTS.basic,
  },
  {
    name: "플러스",
    tagline: "채널이 여러 개로 늘어날 때",
    price: "39,900원",
    highlights: PLAN_HIGHLIGHTS.plus,
    recommended: true,
  },
  {
    name: "프로",
    tagline: "댓글 대응까지 자동으로 맡기고 싶을 때",
    price: "69,900원",
    highlights: PLAN_HIGHLIGHTS.pro,
  },
];

const PLAN_FEATURES: Array<{ label: string; values: PlanFeatureValue[] }> = [
  {
    label: "유튜브 연동",
    values: ["1개", "1개", "2개", "3개"],
  },
  {
    label: "모니터링 영상 수",
    values: ["최대 10개", "최대 50개", "최대 200개", "제한 없음"],
  },
  {
    label: "월 댓글 분석량",
    values: ["1,000개", "10,000개", "30,000개", "50,000개"],
  },
  {
    label: "대댓글 수집",
    values: [false, true, true, true],
  },
  {
    label: "댓글 업데이트 주기",
    values: ["24시간마다", "6시간마다", "1시간마다", "30분마다"],
  },
  {
    label: "이메일 알림",
    values: ["미제공", "일일 요약", "위험 댓글 알림", "위험 댓글 + 중요 이벤트 알림"],
  },
  {
    label: "데이터 보관 기간",
    values: ["7일", "30일", "180일", "무제한"],
  },
  {
    label: "증거 보관함",
    values: ["미제공", "50건", "500건", "제한 없음"],
  },
  {
    label: "증거 PDF 저장",
    values: [
      "미제공",
      "개별 댓글 PDF 저장",
      "개별 저장 + 최대 50건 묶음 PDF",
      "개별 저장 + 최대 200건 묶음 PDF",
    ],
  },
  {
    label: "반복 위험 작성자 추적",
    values: [
      "미제공",
      "반복 작성자 표시",
      "반복 위험 작성자 분석",
      "반복 위험 작성자 집중 모니터링",
    ],
  },
  {
    label: "댓글 대응 관리",
    values: [
      "미제공",
      "개별 댓글 숨김 처리",
      "최대 50건 일괄 숨김 + 작성자 차단",
      "자동 대응 설정 + 위험도별 대응",
    ],
  },
];

// 랜딩페이지와 마이페이지(구독) 양쪽에서 쓰는 요금제 소개 — 안내 박스 + 플랜 카드 +
// 상세 비교표. 실제 구독 변경 버튼은 각 페이지가 이 컴포넌트 바깥에서 별도로 붙인다.
export function PricingTable() {
  return (
    <div>
      <div className="mb-10 text-center">
        <h2 className="mb-2 text-xl font-semibold tracking-tight text-foreground">
          채널 규모에 맞는 댓글 보호 플랜을 선택하세요
        </h2>
        <p className="text-sm text-muted-foreground">
          어떤 등급이든 AI 판정 정확도는 동일합니다. 플랜별 차이는 분석량,
          모니터링 주기, 보관/대응 기능입니다.
        </p>
      </div>

      <div className="mb-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={`flex flex-col overflow-hidden rounded-2xl bg-card ${
              plan.recommended ? "ring-1 ring-chart-5" : ""
            }`}
          >
            <div className="h-1.5 w-full bg-primary" />
            <div className="flex flex-1 flex-col px-7 py-9">
              {plan.recommended ? (
                <p className="mb-3 font-mono text-xs tracking-widest text-chart-5 uppercase">
                  추천
                </p>
              ) : (
                <p className="mb-3 h-[16px]" aria-hidden />
              )}
              <p className="text-base font-semibold tracking-wide uppercase text-primary">
                {plan.name}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {plan.tagline}
              </p>

              <div className="mt-6 mb-2">
                <p className="text-3xl font-semibold tracking-tight text-card-foreground">
                  {plan.price}
                  <span className="text-sm font-normal text-muted-foreground">
                    {" "}
                    / 월
                  </span>
                </p>
              </div>

              <ul className="mt-5 space-y-3 text-sm text-card-foreground">
                {plan.highlights.map((highlight) => (
                  <li key={highlight} className="flex items-start gap-2.5">
                    <span
                      className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary"
                      aria-hidden
                    />
                    {highlight}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      <PlanComparisonTable />
    </div>
  );
}

// 상세 비교표만 단독으로도 쓸 수 있게 분리 — 마이페이지 플랜 카드(자체 CTA 포함)
// 아래에 이 표만 붙이는 용도.
export function PlanComparisonTable() {
  return (
    <div>
      <p className="mb-4 text-center text-xs font-medium tracking-wide text-muted-foreground uppercase">
        상세 비교
      </p>

      <div className="overflow-x-auto rounded-2xl bg-card">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className="px-5 py-5 align-bottom">
                <span className="sr-only">항목</span>
              </th>
              {PLANS.map((plan) => (
                <th key={plan.name} scope="col" className="px-5 py-4 align-bottom">
                  <span className="text-xs font-semibold tracking-wide uppercase text-primary">
                    {plan.name}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PLAN_FEATURES.map((feature) => (
              <tr key={feature.label} className="border-b border-border last:border-b-0">
                <th
                  scope="row"
                  className="px-5 py-4 text-xs font-medium text-muted-foreground"
                >
                  {feature.label}
                </th>
                {feature.values.map((value, index) => (
                  <td
                    key={PLANS[index].name}
                    className="px-5 py-4 text-xs text-card-foreground"
                  >
                    {typeof value === "boolean" ? (
                      value ? (
                        <Check className="size-4 text-primary" />
                      ) : (
                        <X className="size-4 text-muted-foreground/50" />
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
