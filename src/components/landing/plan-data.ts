import {
  BarChart3,
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
} from "lucide-react";
import type { ComponentType } from "react";

import { YoutubeIcon } from "@/components/icons/youtube-icon";
import { FREE_PLAN_HIGHLIGHTS, PLAN_HIGHLIGHTS } from "@/lib/billing/plan-copy";

// 요금제 카드(PricingTable)와 상세 비교표(마이페이지의 PlanComparisonTable,
// 랜딩의 LandingComparisonTable)가 공유하는 플랜 데이터. 문구가 두 곳에서
// 어긋나지 않도록 한 곳에 모은다.

export type PlanFeatureValue = string | boolean;

export type Plan = {
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

export const PLANS: Plan[] = [
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

export const PLAN_FEATURES: Array<{
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
