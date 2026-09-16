import {
  BarChart3,
  Check,
  Clock,
  Crown,
  Database,
  FileText,
  Mail,
  MessagesSquare,
  Settings,
  ShieldCheck,
  Sprout,
  UsersRound,
  Video,
  X,
} from "lucide-react";
import type { ComponentType } from "react";

import { YoutubeIcon } from "@/components/icons/youtube-icon";
import { EyebrowBadge } from "@/components/landing/eyebrow-badge";
import { FREE_PLAN_HIGHLIGHTS, PLAN_HIGHLIGHTS } from "@/lib/billing/plan-copy";

type PlanFeatureValue = string | boolean;

type Plan = {
  name: string;
  icon: ComponentType<{ className?: string }>;
  tagline: string;
  tableTagline: string;
  price: string;
  highlights: string[];
  recommended?: boolean;
  /** 비교표 헤더의 플랜명 색상 — 무료/플러스는 기본 진한색, 베이직/프로만 별도 톤 */
  nameClass?: string;
};

const PLANS: Plan[] = [
  {
    name: "무료",
    icon: Sprout,
    tagline: "일단 지켜보고 있다는 확신이 필요할 때",
    tableTagline: "가볍게 시작할 때",
    price: "0원",
    highlights: FREE_PLAN_HIGHLIGHTS,
  },
  {
    name: "베이직",
    icon: BarChart3,
    tagline: "혼자 채널을 운영하는 크리에이터의 기본기",
    tableTagline: "혼자 운영하는 크리에이터",
    price: "19,900원",
    highlights: PLAN_HIGHLIGHTS.basic,
    nameClass: "text-[#eab308]",
  },
  {
    name: "플러스",
    icon: Crown,
    tagline: "채널이 여러 개로 늘어날 때",
    tableTagline: "채널이 여러 개로 늘어날 때",
    price: "39,900원",
    highlights: PLAN_HIGHLIGHTS.plus,
    recommended: true,
    nameClass: "text-primary",
  },
  {
    name: "프로",
    icon: UsersRound,
    tagline: "댓글 대응까지 자동으로 맡기고 싶을 때",
    tableTagline: "더 강력한 자동화가 필요할 때",
    price: "69,900원",
    highlights: PLAN_HIGHLIGHTS.pro,
    nameClass: "text-[#3b5bdb]",
  },
];

const PLAN_FEATURES: Array<{
  label: string;
  icon: ComponentType<{ className?: string }>;
  values: PlanFeatureValue[];
}> = [
  {
    label: "유튜브 연동",
    icon: YoutubeIcon,
    values: ["1개", "1개", "2개", "3개"],
  },
  {
    label: "모니터링 영상 수",
    icon: Video,
    values: ["최대 10개", "최대 50개", "최대 200개", "제한 없음"],
  },
  {
    label: "월 댓글 분석량",
    icon: BarChart3,
    values: ["1,000개", "10,000개", "30,000개", "50,000개"],
  },
  {
    label: "대댓글 수집",
    icon: MessagesSquare,
    values: [false, true, true, true],
  },
  {
    label: "댓글 업데이트 주기",
    icon: Clock,
    values: ["24시간마다", "6시간마다", "1시간마다", "30분마다"],
  },
  {
    label: "이메일 알림",
    icon: Mail,
    values: ["미제공", "일일 요약", "위험 댓글 알림", "위험 댓글 + 중요 이벤트 알림"],
  },
  {
    label: "데이터 보관 기간",
    icon: Database,
    values: ["7일", "30일", "180일", "무제한"],
  },
  {
    label: "증거 보관함",
    icon: ShieldCheck,
    values: ["미제공", "50건", "500건", "제한 없음"],
  },
  {
    label: "증거 PDF 저장",
    icon: FileText,
    values: [
      "미제공",
      "개별 댓글 PDF 저장",
      "개별 저장 + 최대 50건 묶음 PDF",
      "개별 저장 + 최대 200건 묶음 PDF",
    ],
  },
  {
    label: "반복 위험 작성자 추적",
    icon: UsersRound,
    values: [
      "미제공",
      "반복 작성자 표시",
      "반복 위험 작성자 분석",
      "반복 위험 작성자 집중 모니터링",
    ],
  },
  {
    label: "댓글 대응 관리",
    icon: Settings,
    values: [
      "미제공",
      "개별 댓글 숨김 처리",
      "최대 50건 일괄 숨김 + 작성자 차단",
      "자동 대응 설정 + 위험도별 대응",
    ],
  },
];

// 랜딩페이지 요금제 섹션의 헤더 + 플랜 카드 4장. 상세 비교표는
// PlanComparisonTable로 분리되어 랜딩·마이페이지에서 각각 붙인다.
export function PricingTable() {
  return (
    <div>
      <div className="mx-auto mb-12 flex max-w-2xl flex-col items-center gap-4 text-center">
        <EyebrowBadge icon={Check}>크리에이터의 더 안전한 내일을 위해</EyebrowBadge>
        <h2 className="text-3xl font-extrabold tracking-tight text-[#111111] break-keep sm:text-4xl">
          채널 규모에 맞게 골라 쓰세요
        </h2>
        <p className="text-[15px] leading-relaxed text-[#5b6a61]">
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
                ? "relative overflow-hidden rounded-2xl border-2 border-primary bg-white shadow-xl lg:-translate-y-4"
                : "rounded-2xl border border-black/[0.06] bg-white shadow-sm"
            }
          >
            {plan.recommended && (
              <p className="bg-primary py-2.5 text-center text-[13px] font-semibold text-white">
                가장 많이 선택하는 플랜
              </p>
            )}
            <div className="px-6 py-7">
              <div className="flex items-center gap-3.5">
                <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[#e4efe6] text-primary">
                  <plan.icon className="size-6" />
                </span>
                <p className="text-[22px] font-extrabold text-[#16241d]">
                  {plan.name}
                </p>
              </div>

              <p className="mt-4 min-h-12 text-[15px] leading-relaxed text-[#5b6a61] break-keep">
                {plan.tagline}
              </p>

              <div className="mt-4 border-t border-black/[0.06]" aria-hidden />

              <p className="mt-5">
                <span className="text-4xl font-extrabold tracking-tight text-[#16241d]">
                  {plan.price}
                </span>
                <span className="text-sm font-medium text-[#71806f]"> / 월</span>
              </p>

              <ul className="mt-6 space-y-3.5">
                {plan.highlights.map((highlight) => (
                  <li key={highlight} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#e4efe6]">
                      <Check className="size-3 text-primary" strokeWidth={3} />
                    </span>
                    <span className="text-sm font-medium text-[#3d4a43]">
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

// 상세 비교표 — 랜딩(showHeader)과 마이페이지(라벨만) 양쪽에서 쓴다.
export function PlanComparisonTable({
  showHeader = false,
}: {
  showHeader?: boolean;
}) {
  const lastRow = PLAN_FEATURES.length - 1;

  return (
    <div>
      {showHeader ? (
        <div className="mx-auto mb-12 flex max-w-2xl flex-col items-center gap-4 text-center">
          <EyebrowBadge>상세 비교</EyebrowBadge>
          <h3 className="text-3xl font-extrabold tracking-tight text-[#111111] break-keep sm:text-4xl">
            필요한 기능을, 한눈에 비교해보세요
          </h3>
          <p className="text-[15px] leading-relaxed text-[#5b6a61]">
            어떤 플랜이 나에게 맞을지 고민되시나요? 주요 기능과 제공 범위를
            한눈에 비교할 수 있습니다.
          </p>
        </div>
      ) : (
        <div className="mb-6 text-center">
          <EyebrowBadge>상세 비교</EyebrowBadge>
        </div>
      )}

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
