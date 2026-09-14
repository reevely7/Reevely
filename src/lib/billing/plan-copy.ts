import type { SubscriptionPlan } from "@/lib/db/queries/subscriptions";

// 무료는 SubscriptionPlan enum에 없다(구독 row가 없으면 무료로 취급) — 별도 상수.
export const FREE_PLAN_HIGHLIGHTS: string[] = [
  "유튜브 1개 연동",
  "영상 10개 모니터링",
  "24시간마다 확인",
  "월 1,000개 댓글 분석",
];

// 랜딩 페이지 요금제표와 마이페이지 플랜 카드/변경 다이얼로그가 공유하는 혜택
// 문구 — 두 곳에서 따로 들고 있으면 문구가 어긋나기 쉬워 한 곳에 모은다.
export const PLAN_HIGHLIGHTS: Record<SubscriptionPlan, string[]> = {
  basic: [
    "유튜브 1개 연동",
    "영상 50개 · 대댓글 수집",
    "6시간마다 확인",
    "월 10,000개 댓글 분석",
  ],
  plus: [
    "유튜브 2개 연동",
    "영상 200개 · 1시간마다 확인",
    "월 30,000개 댓글 분석",
    "증거 보관함 500건 + 묶음 PDF",
  ],
  pro: [
    "유튜브 3개 연동 · 영상 수 제한 없음",
    "30분마다 확인 · 월 50,000개 분석",
    "증거 보관함 · 데이터 보관 무제한",
    "자동 대응 관리 + 반복 위험 작성자 집중 모니터링",
  ],
};
