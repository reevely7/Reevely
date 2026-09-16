import {
  Archive,
  Bell,
  LayoutDashboard,
  MessageSquare,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import type { ComponentType } from "react";

import { handwritingFont, wordmarkFont } from "@/lib/fonts";

// 히어로 오른쪽 대시보드 미리보기 목업 — 실제 데이터가 아닌 서비스 화면
// 구조를 요약한 정적 일러스트. 데스크톱에서는 3D 원근감으로 기울어져
// 왼쪽이 앞으로 나오고, 오른쪽이 화면 밖으로 살짝 빠져나간다.

function SidebarItem({
  icon: Icon,
  label,
  badge,
  active,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  badge?: string;
  active?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-semibold ${
        active
          ? "bg-primary text-white shadow-md shadow-primary/25"
          : "text-[#5c6b63]"
      }`}
    >
      <Icon className="size-4 shrink-0" />
      <span className="flex-1 truncate">{label}</span>
      {badge && (
        <span className="rounded-full bg-[#e4efe6] px-2 py-0.5 text-[11px] font-bold text-primary">
          {badge}
        </span>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  iconClass,
  label,
  value,
  delta,
  deltaClass,
}: {
  icon: ComponentType<{ className?: string }>;
  iconClass: string;
  label: string;
  value: string;
  delta: string;
  deltaClass: string;
}) {
  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white px-4 py-4 text-center shadow-sm">
      <div className="flex items-center justify-center gap-1.5">
        <Icon className={`size-4 ${iconClass}`} />
        <span className="text-xs font-semibold text-[#71806f]">{label}</span>
      </div>
      <p className="mt-1.5 text-[32px] leading-none font-extrabold text-[#16241d]">
        {value}
      </p>
      <span
        className={`mt-2.5 inline-block rounded-full px-2.5 py-1 text-[11px] leading-none font-bold ${deltaClass}`}
      >
        {delta}
      </span>
    </div>
  );
}

// 순화된 예시 문장 — 실제 서비스 화면 분위기를 보여주기 위한 가짜 데이터.
const RISK_ROWS: Array<{
  label: string;
  pillClass: string;
  text: string;
}> = [
  {
    label: "High",
    pillClass: "bg-[#fce8e8] text-[#c04545]",
    text: "채널 접는 게 낫지 않아요? 더 볼 이유가 없네요",
  },
  {
    label: "Medium",
    pillClass: "bg-[#fbf0d2] text-[#8a6d1f]",
    text: "이번 영상은 진짜 실망입니다, 예전만 못하네요",
  },
  {
    label: "Medium",
    pillClass: "bg-[#fbf0d2] text-[#8a6d1f]",
    text: "광고만 늘어나는 것 같아서 구독 취소합니다",
  },
];

export function HeroDashboardPreview() {
  return (
    <div className="relative w-full max-w-[560px] lg:w-[700px] lg:max-w-none">
      {/* 목업 뒤 글로우 블롭 */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-10 -z-10 rounded-[4rem] bg-gradient-to-br from-[#d9e8dc] via-[#e6f0e7]/60 to-transparent opacity-90 blur-2xl"
      />

      {/* 손글씨 낙서 — 목업 우측 상단에 살짝 겹치게 */}
      <div
        aria-hidden
        className={`${handwritingFont.className} absolute -top-12 right-4 z-20 hidden rotate-[-8deg] text-[22px] leading-[1.02] font-semibold text-[#49564e] lg:block`}
      >
        <p>Good</p>
        <p>Creators</p>
        <p className="relative">
          Brighter —
          <svg
            viewBox="0 0 24 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            className="absolute top-0.5 -right-7 h-4 w-6"
            aria-hidden
          >
            <path d="M5 16 9 5" />
            <path d="M12 17 16 6" />
            <path d="M19 18 23 7" />
          </svg>
        </p>
        <p>Tomorrow</p>
      </div>

      {/* 카드 본체 — lg 이상에서만 3D 기울임 */}
      <div className="overflow-hidden rounded-3xl bg-white shadow-[0_60px_120px_-35px_rgba(30,45,38,0.45)] ring-1 ring-black/5 lg:[transform:perspective(1500px)_rotateY(-12deg)_rotateX(4deg)]">
        <div className="flex">
          {/* 사이드바 */}
          <div className="hidden w-44 shrink-0 flex-col gap-1.5 border-r border-black/[0.05] px-3.5 py-5 sm:flex">
            <div className="mb-4 flex items-center gap-2 px-1.5">
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary">
                <ShieldCheck className="size-4 text-white" />
              </span>
              <span
                className={`${wordmarkFont.className} relative top-px text-[15px] font-extrabold text-[#16241d]`}
              >
                Reevely
              </span>
            </div>
            <SidebarItem icon={LayoutDashboard} label="대시보드" active />
            <SidebarItem icon={MessageSquare} label="댓글 목록" />
            <SidebarItem icon={ShieldAlert} label="검토 필요" badge="11" />
            <SidebarItem icon={Archive} label="증거 보관함" />
            <SidebarItem icon={Bell} label="알림" badge="9" />
          </div>

          {/* 콘텐츠 */}
          <div className="flex-1 px-5 py-5 sm:px-6 sm:py-6">
            <p className="text-[17px] font-extrabold text-[#16241d]">
              안녕하세요! 👋
            </p>
            <p className="mt-1 text-xs text-[#71806f]">
              오늘도 안전한 창작 활동을 응원해요.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <StatCard
                icon={ShieldCheck}
                iconClass="text-primary"
                label="총 댓글"
                value="30"
                delta="+ 12%"
                deltaClass="bg-[#e4efe6] text-[#2f6b4d]"
              />
              <StatCard
                icon={TriangleAlert}
                iconClass="text-amber-500"
                label="검토 필요"
                value="11"
                delta="- 8%"
                deltaClass="bg-[#fbf0d2] text-[#8a6d1f]"
              />
            </div>

            <div className="mt-4 rounded-2xl border border-black/[0.06] bg-white px-4 py-4 shadow-sm">
              <p className="text-[13px] font-bold text-[#16241d]">
                최근 위험 댓글
              </p>
              <div className="mt-3 space-y-2.5">
                {RISK_ROWS.map((row, index) => (
                  <div key={index} className="flex min-w-0 items-center gap-2.5">
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] leading-none font-bold ${row.pillClass}`}
                    >
                      {row.label}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs text-[#4b5a51]">
                      {row.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
