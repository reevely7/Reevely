"use client";

import {
  Archive,
  Bookmark,
  LayoutDashboard,
  MessageSquare,
  Search,
  ShieldCheck,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import Image from "next/image";
import type { ComponentType } from "react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { wordmarkFont } from "@/lib/fonts";

// 히어로 우측 앱 목업 — 브라우저 창 안에 서비스 화면을 담아 3D로 살짝
// 기울이고, 가장자리로 미니 카드들이 삐져나오게 배치한다. 실제 서비스
// 메뉴 4개를 3초마다 자동 전환한다. 순화된 예시 데이터만 사용.

const CYCLE_MS = 3000;

const RISK = {
  high: "bg-[#fce8e8] text-[#c04545]",
  medium: "bg-[#fbf0d2] text-[#8a6d1f]",
};

type ScreenDef = {
  key: string;
  label: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
  badge?: string;
  render: () => React.ReactNode;
};

function StatCard({
  icon: Icon,
  chipClass,
  label,
  value,
  delta,
  deltaClass,
}: {
  icon: ComponentType<{ className?: string }>;
  chipClass: string;
  label: string;
  value: string;
  delta: string;
  deltaClass: string;
}) {
  return (
    <div className="rounded-2xl border border-black/[0.05] bg-white px-3 py-3 text-center shadow-[0_10px_24px_-16px_rgba(20,33,27,0.35)]">
      <div className="flex items-center justify-center gap-1.5">
        <span className={`flex size-4 items-center justify-center rounded-full ${chipClass}`}>
          <Icon className="size-2.5" />
        </span>
        <span className="text-[10px] font-semibold text-[#71806f]">{label}</span>
      </div>
      <p className="mt-1 text-[22px] leading-none font-extrabold text-[#16241d]">
        {value}
      </p>
      <span
        className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[9px] leading-none font-bold ${deltaClass}`}
      >
        {delta}
      </span>
    </div>
  );
}

function DashboardScreen() {
  const rows = [
    { label: "High", cls: RISK.high, text: "채널 접는 게 낫지 않아요? 더 볼 이유가 없네요" },
    { label: "Medium", cls: RISK.medium, text: "이번 영상은 진짜 실망입니다, 예전만 못하네요" },
    { label: "Medium", cls: RISK.medium, text: "광고만 늘어나는 것 같아서 구독 취소합니다" },
  ];
  return (
    <>
      <p className="text-[14px] font-extrabold text-[#16241d]">안녕하세요! 👋</p>
      <p className="mt-0.5 text-[10px] text-[#71806f]">
        오늘도 안전한 창작 활동을 응원해요.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <StatCard
          icon={ShieldCheck}
          chipClass="bg-[#e4efe6] text-[#3e6856]"
          label="총 댓글"
          value="30"
          delta="+ 12%"
          deltaClass="bg-[#e4efe6] text-[#2f6b4d]"
        />
        <StatCard
          icon={TriangleAlert}
          chipClass="bg-[#fbf0d2] text-[#c98a1a]"
          label="검토 필요"
          value="11"
          delta="- 8%"
          deltaClass="bg-[#fbf0d2] text-[#8a6d1f]"
        />
      </div>
      <div className="mt-2.5 rounded-2xl border border-black/[0.05] bg-white px-3.5 py-3 shadow-[0_10px_24px_-16px_rgba(20,33,27,0.35)]">
        <p className="text-[11px] font-bold text-[#16241d]">최근 위험 댓글</p>
        <div className="mt-2 space-y-2">
          {rows.map((r) => (
            <div key={r.text} className="flex min-w-0 items-center gap-2">
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] leading-none font-bold ${r.cls}`}
              >
                {r.label}
              </span>
              <span className="min-w-0 flex-1 truncate text-[10px] text-[#4b5a51]">
                {r.text}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function CommentsScreen() {
  const rows = [
    { label: "High", cls: RISK.high, text: "채널 접는 게 낫지 않아요?", cat: "명예훼손", conf: "0.92" },
    { label: "Medium", cls: RISK.medium, text: "예전만 못하네요, 실망입니다", cat: "비하", conf: "0.78" },
    { label: "High", cls: RISK.high, text: "가만 안 둘 거니까 각오해라", cat: "협박", conf: "0.88" },
    { label: "Medium", cls: RISK.medium, text: "광고충 다 됐네 구독 취소", cat: "욕설", conf: "0.74" },
  ];
  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-[14px] font-extrabold text-[#16241d]">댓글 목록</p>
        <div className="flex gap-1.5">
          <span className="rounded-full bg-[#3e6856] px-2.5 py-1 text-[10px] font-bold text-white">
            전체
          </span>
          <span className="rounded-full bg-[#f0f2f0] px-2.5 py-1 text-[10px] font-bold text-[#71806f]">
            High
          </span>
          <span className="rounded-full bg-[#f0f2f0] px-2.5 py-1 text-[10px] font-bold text-[#71806f]">
            Medium
          </span>
        </div>
      </div>
      <div className="mt-3 space-y-2.5">
        {rows.map((r) => (
          <div
            key={r.text}
            className="flex items-center gap-2.5 rounded-2xl border border-black/[0.05] bg-white px-3.5 py-3 shadow-[0_10px_24px_-16px_rgba(20,33,27,0.35)]"
          >
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] leading-none font-bold ${r.cls}`}
            >
              {r.label}
            </span>
            <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-[#374840]">
              {r.text}
            </span>
            <span className="shrink-0 rounded-md bg-[#f0f2f0] px-1.5 py-0.5 text-[10px] font-semibold text-[#5c6b63]">
              {r.cat}
            </span>
            <span className="shrink-0 text-[10px] font-bold text-[#9aa79f]">
              {r.conf}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

function AuthorsScreen() {
  const rows = [
    { initial: "K", name: "@k_hater92", count: "악성 댓글 5건", repeat: true },
    { initial: "ㅈ", name: "@angry_view", count: "악성 댓글 3건", repeat: true },
    { initial: "N", name: "@no_name_77", count: "악성 댓글 2건", repeat: false },
  ];
  return (
    <>
      <p className="text-[14px] font-extrabold text-[#16241d]">작성자 검색</p>
      <div className="mt-3 flex items-center gap-2 rounded-2xl border border-black/[0.05] bg-white px-3.5 py-3 shadow-[0_10px_24px_-16px_rgba(20,33,27,0.35)]">
        <Search className="size-3.5 text-[#9aa79f]" />
        <span className="text-[11px] text-[#9aa79f]">작성자 닉네임으로 검색</span>
      </div>
      <div className="mt-2.5 space-y-2.5">
        {rows.map((r) => (
          <div
            key={r.name}
            className="flex items-center gap-2.5 rounded-2xl border border-black/[0.05] bg-white px-3.5 py-3 shadow-[0_10px_24px_-16px_rgba(20,33,27,0.35)]"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#e4efe6] text-[12px] font-bold text-[#3e6856]">
              {r.initial}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-bold text-[#16241d]">
                {r.name}
              </p>
              <p className="text-[10px] text-[#71806f]">{r.count}</p>
            </div>
            {r.repeat && (
              <span className="shrink-0 rounded-full bg-[#fce8e8] px-2 py-0.5 text-[10px] font-bold text-[#c04545]">
                반복 위험
              </span>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

function ArchiveScreen() {
  const cards = [
    { label: "High", cls: RISK.high, text: "가만 안 둘 거니까 각오해라", date: "2026.09.14 저장" },
    { label: "High", cls: RISK.high, text: "채널 접는 게 낫지 않아요?", date: "2026.09.12 저장" },
    { label: "Medium", cls: RISK.medium, text: "예전만 못하네요, 실망입니다", date: "2026.09.10 저장" },
  ];
  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-[14px] font-extrabold text-[#16241d]">증거 보관함</p>
        <span className="rounded-full bg-[#e4efe6] px-2.5 py-1 text-[10px] font-bold text-[#3e6856]">
          3건 보관
        </span>
      </div>
      <div className="mt-3 space-y-2.5">
        {cards.map((c) => (
          <div
            key={c.text}
            className="flex items-center gap-2.5 rounded-2xl border border-black/[0.05] bg-white px-3.5 py-3 shadow-[0_10px_24px_-16px_rgba(20,33,27,0.35)]"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#e4efe6] text-[#3e6856]">
              <Bookmark className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-medium text-[#374840]">
                {c.text}
              </p>
              <p className="text-[10px] text-[#9aa79f]">{c.date}</p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] leading-none font-bold ${c.cls}`}
            >
              {c.label}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

const SCREENS: ScreenDef[] = [
  { key: "dashboard", label: "대시보드", path: "dashboard", icon: LayoutDashboard, render: DashboardScreen },
  { key: "comments", label: "댓글 목록", path: "comments", icon: MessageSquare, badge: "30", render: CommentsScreen },
  { key: "authors", label: "작성자 검색", path: "authors", icon: UserRound, render: AuthorsScreen },
  { key: "archive", label: "증거 보관함", path: "evidence-archive", icon: Archive, badge: "3", render: ArchiveScreen },
];

// lg 브레이크포인트에서 3D로 고정 기울임 — 마우스를 올려도 각도는 바뀌지 않는다.
// Tailwind 임의값 브래킷 문법의 다중 transform 체이닝이 이 프로젝트
// 빌드에서 CSSOM에 반영되지 않는 문제가 있어, 인라인 스타일로 직접 제어한다.
const TILT_TRANSFORM = "rotateY(-9deg) rotateX(5deg) rotateZ(-1.5deg)";

function subscribeToDesktopQuery(callback: () => void) {
  const mql = window.matchMedia("(min-width: 1024px)");
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

// SSR 마크업과 클라이언트 첫 렌더가 항상 false로 일치해야 하이드레이션
// 경고가 나지 않는다 — useSyncExternalStore가 그 규약을 지켜준다.
function useIsDesktop() {
  return useSyncExternalStore(
    subscribeToDesktopQuery,
    () => window.matchMedia("(min-width: 1024px)").matches,
    () => false,
  );
}

export function HeroAppMockup() {
  const [active, setActive] = useState(0);
  const isDesktop = useIsDesktop();
  const tiltRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setInterval(() => {
      setActive((i) => (i + 1) % SCREENS.length);
    }, CYCLE_MS);
    return () => clearInterval(id);
  }, []);

  // 이 프로젝트 빌드 환경에서 일반 인라인 transform이 알 수 없는 이유로
  // 무시되는 현상이 있어(다른 속성은 정상 적용), setProperty를 important
  // 우선순위로 직접 걸어 확실히 반영되게 한다.
  useEffect(() => {
    const node = tiltRef.current;
    if (!node) return;
    if (isDesktop) {
      node.style.setProperty("transform", TILT_TRANSFORM, "important");
    } else {
      node.style.removeProperty("transform");
    }
  }, [isDesktop]);

  const Screen = SCREENS[active].render;

  return (
    <div className="relative mx-auto w-full max-w-[540px] lg:max-w-none lg:[perspective:2000px]">
      {/* 뒤 라임 글로우 + 낙서 대시 곡선 (레퍼런스의 점선 스우시 역할) */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-10 -z-10 rounded-[3rem] bg-[var(--landing-lime)]/10 blur-3xl"
      />
      <svg
        aria-hidden
        viewBox="0 0 400 300"
        className="pointer-events-none absolute -top-6 -right-6 -z-10 hidden h-40 w-52 text-[var(--landing-lime)]/50 sm:block"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="2 12"
      >
        <path d="M20 260 C 120 40, 300 40, 380 120" />
      </svg>

      {/* 메인 브라우저 창 — lg에서 3D로 고정 기울임 (마우스 호버에 반응하지 않음).
          rotateZ를 살짝 섞어 너무 반듯하게 정렬된 느낌을 깨고, 배경색도
          완전 불투명 대신 약간 흐리게(backdrop-blur) 둬서 딱딱함을 뺀다. */}
      <div
        ref={tiltRef}
        className="landing-rise relative z-10 overflow-hidden rounded-[1.5rem] bg-white/90 shadow-[0_45px_100px_-32px_rgba(8,20,14,0.6)] ring-1 ring-black/[0.06] backdrop-blur-sm"
      >
        {/* 브라우저 크롬 — 신호등 점 + 주소창(화면 따라 경로 변경) */}
        <div className="flex items-center gap-2 border-b border-black/[0.06] bg-[#eef1ee] px-4 py-3">
          <span className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-[#e8938f]" />
            <span className="size-2.5 rounded-full bg-[#e8c66f]" />
            <span className="size-2.5 rounded-full bg-[#8fc79b]" />
          </span>
          <div className="ml-2 flex flex-1 items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 ring-1 ring-black/[0.05]">
            <ShieldCheck className="size-3 text-[#8fa89a]" />
            <span className="truncate text-[10px] font-medium text-[#9aa79f]">
              app.reevely.com/{SCREENS[active].path}
            </span>
          </div>
        </div>

        {/* 상단 진행 바 — 3초에 걸쳐 채워지며 자동 전환을 암시 */}
        <div className="h-[3px] w-full bg-[#eef1ee]">
          <div
            key={active}
            className="landing-progress-fill h-full rounded-r-full bg-[var(--landing-lime)]"
            style={{ "--cycle-ms": `${CYCLE_MS}ms` } as React.CSSProperties}
          />
        </div>

        <div className="flex">
          {/* 사이드바 */}
          <div className="hidden w-[168px] shrink-0 flex-col gap-1 border-r border-black/[0.05] bg-white/85 px-3.5 py-4 sm:flex">
            <div className="mb-3 flex items-center gap-2 px-1.5">
              <Image
                src="/logo-mark.png"
                alt=""
                width={22}
                height={22}
                className="size-[22px]"
              />
              <span
                className={`${wordmarkFont.className} relative top-px text-[15px] font-extrabold tracking-tight text-[#16241d]`}
              >
                Reevely
              </span>
            </div>
            {SCREENS.map((screen, index) => {
              const isActive = index === active;
              return (
                <div
                  key={screen.key}
                  className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-[12px] font-semibold transition-colors duration-300 ${
                    isActive
                      ? "bg-[#3e6856] text-white shadow-[0_10px_20px_-10px_rgba(62,104,86,0.7)]"
                      : "text-[#7c8a82]"
                  }`}
                >
                  <screen.icon className="size-4 shrink-0" />
                  <span className="flex-1 truncate">{screen.label}</span>
                  {screen.badge && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] leading-none font-bold ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-[#e4efe6] text-[#3e6856]"
                      }`}
                    >
                      {screen.badge}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* 콘텐츠 — 화면 전환 시 페이드 인. 높이를 고정(min이 아닌 h)해야
              화면마다 실제 콘텐츠 길이가 달라도 브라우저 창 크기가 항상
              동일하게 유지된다. */}
          <div className="h-[332px] flex-1 overflow-hidden bg-[#f7f9f7]/85 p-4 sm:h-[320px]">
            <div key={active} className="landing-screen-in">
              <Screen />
            </div>
          </div>
        </div>
      </div>

      {/* 모바일: 사이드바 대신 현재 메뉴를 알약으로 표시 */}
      <div className="mt-3.5 flex flex-wrap justify-center gap-1.5 sm:hidden">
        {SCREENS.map((screen, index) => (
          <span
            key={screen.key}
            className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors ${
              index === active
                ? "bg-[var(--landing-lime)] text-[var(--landing-ink)]"
                : "bg-white/10 text-white/60"
            }`}
          >
            {screen.label}
          </span>
        ))}
      </div>
    </div>
  );
}
