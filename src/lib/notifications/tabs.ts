import type { NotificationType } from "@/lib/db/queries/notifications";

export type NotificationTabKey = "all" | "risk" | "repeat" | "notice";

// PPT 스펙(08. 알림 화면)의 4개 탭 — 실제 notificationType 9종 중 채널 단위
// 6종만 여기 매핑된다. 계정 단위 결제/한도 알림(payment_*, analysis_quota_reached)은
// 이 페이지 범위 밖(사용자 확정) — /mypage/subscription에서만 노출한다.
export const NOTIFICATION_TABS: Array<{
  key: NotificationTabKey;
  label: string;
  types: NotificationType[] | null;
}> = [
  { key: "all", label: "전체", types: null },
  {
    key: "risk",
    label: "위험 알림",
    types: ["new_comment", "video_spike", "review_backlog"],
  },
  { key: "repeat", label: "반복 작성자", types: ["repeat_author"] },
  {
    key: "notice",
    label: "공지사항",
    types: ["weekly_digest", "reauth_required"],
  },
];
