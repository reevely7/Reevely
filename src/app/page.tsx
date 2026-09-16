import {
  BarChart3,
  Check,
  FileText,
  Heart,
  Leaf,
  Lock,
  Shield,
  ShieldCheck,
  Users2,
} from "lucide-react";
import Image from "next/image";
import { redirect } from "next/navigation";

import { KakaoSignInButton } from "@/components/auth/kakao-sign-in-button";
import { EyebrowBadge } from "@/components/landing/eyebrow-badge";
import { HeroAppMockup } from "@/components/landing/hero-app-mockup";
import { LandingComparisonTable } from "@/components/landing/landing-comparison-table";
import { LandingMobileNav } from "@/components/landing/landing-mobile-nav";
import { PricingTable } from "@/components/landing/pricing-table";
import { Reveal } from "@/components/landing/reveal";
import { SiteFooter } from "@/components/landing/site-footer";
import { Button } from "@/components/ui/button";
import { getChannelsByUserId } from "@/lib/db/queries/channels";
import { handwritingFont, wordmarkFont } from "@/lib/fonts";
import { createClient } from "@/lib/supabase/server";

const ERROR_MESSAGES: Record<string, string> = {
  auth: "로그인 처리 중 문제가 발생했습니다. 다시 시도해 주세요.",
};

const STEPS = [
  {
    title: "채널을 연동해요",
    body: "유튜브 채널을 OAuth로 직접 연동합니다. 소스코드 없이 YouTube Data API 공식 연동이라 계정 정보는 저희를 거치지 않아요.",
    artSrc: "/landing/step-1-connect.png",
  },
  {
    title: "잠든 사이에도 확인해요",
    body: "크리에이터가 콘텐츠에 집중하는 동안, 백그라운드에서 새 댓글을 놓치지 않고 확인합니다.",
    artSrc: "/landing/step-2-watch.png",
  },
  {
    title: "AI가 위험도를 판정해요",
    body: "댓글 하나하나를 분석해 위험도와 유형, 판정 근거를 함께 남깁니다.",
    artSrc: "/landing/step-3-judge.png",
  },
  {
    title: "대시보드에서 확인해요",
    body: "위험도별로 정리된 화면에서 확인하고, 필요하면 숨김 처리나 오탐 신고를 한 번으로 끝낼 수 있어요.",
    artSrc: "/landing/step-4-dashboard.png",
  },
];

const HERO_HIGHLIGHTS = [
  {
    icon: ShieldCheck,
    title: "악성 댓글 자동 탐지",
    caption: "AI 기반 실시간 필터링",
  },
  {
    icon: BarChart3,
    title: "안전한 커뮤니티 조성",
    caption: "건강한 소통 환경 구축",
  },
  {
    icon: Users2,
    title: "크리에이터의 성장 지원",
    caption: "더 나은 내일을 함께",
  },
];

const FEATURE_CARDS = [
  {
    icon: ShieldCheck,
    title: "악성 댓글 자동 탐지",
    body: "AI가 욕설, 혐오, 협박 등 유해한 댓글을 실시간으로 탐지해 위험도를 분석합니다.",
  },
  {
    icon: BarChart3,
    title: "안전한 커뮤니티 조성",
    body: "유해 댓글을 필터링하고 긍정적인 소통이 이어질 수 있는 건강한 댓글 환경을 만들어줍니다.",
  },
  {
    icon: Users2,
    title: "크리에이터의 성장 지원",
    body: "댓글 관리에 드는 시간을 줄여 콘텐츠 제작에 더 집중할 수 있도록 도와드립니다.",
  },
  {
    icon: FileText,
    title: "증거 보관·관리",
    body: "문제가 되는 댓글은 자동으로 저장하고, 필요할 때 증거 자료로 내보낼 수 있습니다.",
  },
];

const CLOSING_HIGHLIGHTS = [
  {
    icon: Shield,
    title: "간단한 연동으로 바로 시작",
    caption: "YouTube Data API 기반, 안전한 연동",
  },
  {
    icon: Lock,
    title: "소중한 데이터는 안전하게",
    caption: "개인정보를 철저히 보호합니다",
  },
  {
    icon: Heart,
    title: "더 건강한 창작 생태계를 위해",
    caption: "좋은 크리에이터와 함께 성장합니다",
  },
];

// 포스터형 CTA 버튼 — 다크(잉크) 배경 위주 섹션과 화이트 섹션에서 공유.
const CTA_ON_DARK =
  "h-[56px] w-auto rounded-full bg-[var(--landing-lime)] px-9 text-base font-extrabold text-[var(--landing-ink)] shadow-none transition-all duration-300 hover:-translate-y-0.5 hover:bg-white";
const CTA_ON_LIGHT =
  "h-[56px] w-auto rounded-full bg-[var(--landing-ink)] px-9 text-base font-bold text-white shadow-none transition-all duration-300 hover:-translate-y-0.5 hover:bg-[var(--landing-forest)]";

function HighlightPills({
  items,
}: {
  items: Array<{
    icon: (typeof HERO_HIGHLIGHTS)[number]["icon"];
    title: string;
    caption: string;
  }>;
}) {
  return (
    <div className="flex flex-col items-stretch justify-center gap-4 sm:flex-row sm:flex-wrap">
      {items.map((item, index) => (
        <Reveal key={item.title} delay={index * 90}>
          <div className="flex h-full items-center gap-3.5 rounded-full border border-black/[0.07] bg-white py-3.5 pr-7 pl-4 transition-transform duration-300 hover:-translate-y-1">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--landing-lime)] text-[var(--landing-ink)]">
              <item.icon className="size-5" />
            </span>
            <div>
              <p className="text-[15px] leading-tight font-extrabold text-[#16241d]">
                {item.title}
              </p>
              <p className="mt-0.5 text-[13px] leading-tight text-[#71806f]">
                {item.caption}
              </p>
            </div>
          </div>
        </Reveal>
      ))}
    </div>
  );
}

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const errorMessage = error ? ERROR_MESSAGES[error] : undefined;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const channels = await getChannelsByUserId(user.id);
    redirect(channels.length > 0 ? `/c/${channels[0].id}/dashboard` : "/onboarding");
  }

  return (
    <main className="font-pretendard flex flex-1 flex-col bg-[#f8f8f8]">
      {/* ── 히어로: 풀블리드 딥그린 포스터 블록 ─────────────────── */}
      <div>
        <div className="relative overflow-hidden bg-[var(--landing-forest)]">
          {/* 깊은 그린 블롭 배경 */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-40 -right-32 size-[560px] rounded-full bg-[var(--landing-forest-deep)] opacity-80 blur-[100px]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-48 -left-32 size-[520px] rounded-full bg-[#3a6d58] opacity-60 blur-[110px]"
          />

          {/* 상단 내비게이션 */}
          <header className="relative z-20 mx-auto flex w-full max-w-[1240px] items-center justify-between px-6 py-6 sm:px-8">
            <div className="flex items-center gap-2.5">
              <Image
                src="/icon.png"
                alt=""
                width={32}
                height={32}
                className="size-8"
              />
              <span
                className={`${wordmarkFont.className} relative top-0.5 text-xl font-extrabold tracking-tight text-white`}
              >
                Reevely
              </span>
            </div>
            <nav className="hidden items-center gap-2 md:flex">
              <a
                href="#how-it-works"
                className="rounded-full px-4 py-2 text-[15px] font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              >
                서비스 소개
              </a>
              <a
                href="#pricing"
                className="rounded-full px-4 py-2 text-[15px] font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              >
                요금제
              </a>
            </nav>
            <div className="flex items-center gap-2">
              <LandingMobileNav />
              <a
                href="/login"
                className="hidden rounded-full border border-white/25 px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-white hover:text-[var(--landing-ink)] md:inline-block"
              >
                로그인
              </a>
            </div>
          </header>

          {/* 히어로 본문 */}
          <section className="relative z-10 mx-auto w-full max-w-[1240px] px-6 pt-6 pb-16 sm:px-8 md:pt-10 md:pb-20">
            <div className="grid items-center gap-12 lg:grid-cols-[54fr_46fr] lg:gap-6">
              {/* 좌측 타이포 */}
              <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
                <span
                  className="landing-rise inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[13px] font-semibold text-white backdrop-blur-sm"
                  style={{ animationDelay: "0.05s" }}
                >
                  <Check className="size-3.5 text-[var(--landing-lime)]" />
                  크리에이터의 더 안전한 내일을 위해
                </span>

                <h1
                  className="landing-rise mt-7 text-[clamp(34px,7vw,88px)] leading-[1.08] font-extrabold tracking-[-0.03em] text-white break-keep"
                  style={{ animationDelay: "0.15s" }}
                >
                  좋은 크리에이터의
                  <br />
                  <span className="relative inline-block rotate-[-2deg] rounded-[0.45em] bg-[var(--landing-lime)] px-[0.2em] pb-[0.06em] text-[var(--landing-ink)]">
                    내일
                  </span>
                  을 지킵니다
                </h1>

                <p
                  className="landing-rise mt-7 max-w-[460px] text-base leading-relaxed text-white/75 lg:text-[17px]"
                  style={{ animationDelay: "0.28s" }}
                >
                  Reevely는 악성 댓글로부터 크리에이터를 보호하고,{" "}
                  <br className="hidden sm:inline" />
                  더 건강한 커뮤니티 문화를 만들어가는{" "}
                  <br className="hidden sm:inline" />
                  AI 기반 댓글 관리 솔루션입니다.
                </p>

                {errorMessage && (
                  <p className="mt-4 rounded-xl bg-[#fce8e8] px-4 py-2.5 text-xs font-semibold text-[#c04545]">
                    {errorMessage}
                  </p>
                )}

                <div
                  className="landing-rise mt-9 flex flex-col items-center gap-3 sm:flex-row"
                  style={{ animationDelay: "0.4s" }}
                >
                  <KakaoSignInButton
                    label="무료로 시작하기 →"
                    className={CTA_ON_DARK}
                  />
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-[56px] w-auto rounded-full border-white/25 bg-transparent px-9 text-base font-bold text-white shadow-none transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/10 hover:text-white"
                    nativeButton={false}
                    render={<a href="#how-it-works">서비스 소개 보기</a>}
                  />
                </div>
              </div>

              {/* 우측 스티커 클러스터 */}
              <HeroAppMockup />
            </div>
          </section>
        </div>
      </div>

      {/* ── 동작 원리 ───────────────────────────────────────────── */}
      <section id="how-it-works" className="scroll-mt-6 px-6 py-20 md:py-28">
        <div className="mx-auto max-w-[1240px]">
          <Reveal>
            <div className="mx-auto mb-14 flex max-w-3xl flex-col items-center gap-5 text-center">
              <EyebrowBadge icon={Leaf}>간단한 설정으로 더 안전한 커뮤니티</EyebrowBadge>
              <h2 className="text-[clamp(32px,4.5vw,54px)] leading-[1.12] font-extrabold tracking-[-0.02em] text-[var(--landing-ink)] break-keep">
                이렇게 동작해요
              </h2>
              <p className="text-[15px] leading-relaxed text-[#5b6a61] sm:text-base">
                복잡한 설정 없이, 4단계만으로 채널의 댓글을 AI가 실시간으로
                모니터링합니다.{" "}
                <br className="hidden sm:inline" />
                지금 바로 시작해보세요.
              </p>
            </div>
          </Reveal>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <Reveal key={step.title} delay={index * 100} className="h-full">
                <div
                  className={`group flex h-full flex-col rounded-[2rem] bg-white p-7 ring-1 ring-black/[0.05] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_30px_60px_-30px_rgba(20,33,27,0.35)] ${
                    index % 2 === 0 ? "lg:rotate-[-1.2deg]" : "lg:rotate-[1.2deg]"
                  } lg:hover:rotate-0`}
                >
                  <span className="inline-flex size-11 rotate-[-6deg] items-center justify-center self-start rounded-2xl bg-[var(--landing-ink)] text-[15px] font-extrabold text-[var(--landing-lime)] transition-transform duration-300 group-hover:rotate-6">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="relative mt-6 h-36">
                    <Image
                      src={step.artSrc}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 25vw, 50vw"
                      className="object-contain"
                    />
                  </div>
                  <p className="mt-6 text-lg font-extrabold text-[var(--landing-ink)]">
                    {step.title}
                  </p>
                  <p className="mt-2.5 text-sm leading-relaxed text-[#5b6a61]">
                    {step.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── 오탐 관리 원칙: 라임 포스터 블록 ─────────────────────── */}
      <section className="px-3 pb-20 sm:px-4 md:pb-28">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] bg-[var(--landing-lime)] px-6 py-20 sm:rounded-[2.75rem] md:py-28">
            {/* 잉크 낙서 밑줄 원 — 배경 장식 */}
            <div
              aria-hidden
              className="pointer-events-none absolute -top-24 -right-20 size-72 rounded-full border-[3px] border-[var(--landing-ink)]/10"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-28 -left-16 size-80 rounded-full border-[3px] border-[var(--landing-ink)]/10"
            />

            <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-6 text-center">
              <EyebrowBadge tone="white" icon={ShieldCheck}>
                오탐 관리 원칙
              </EyebrowBadge>
              <h2 className="text-[clamp(32px,5vw,60px)] leading-[1.12] font-extrabold tracking-[-0.02em] text-[var(--landing-ink)] break-keep">
                확신 없는 판정은, 확정하지 않습니다
              </h2>
              <p className="max-w-2xl text-[15px] leading-relaxed text-[var(--landing-ink)]/70 sm:text-base">
                AI가 확신하지 못한 댓글(confidence 0.7 미만)은 자동으로 확정하지
                않고{" "}
                <br className="hidden sm:inline" />
                별도의 검토 큐로 분리합니다. 잘못된 확정보다, 사람이 한 번 더
                확인하는 쪽을 택했습니다.
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── 요금제 ─────────────────────────────────────────────── */}
      <section id="pricing" className="scroll-mt-6 px-6 pb-20 md:pb-28">
        <div className="mx-auto max-w-[1240px]">
          <div className="relative">
            <div
              aria-hidden
              className={`${handwritingFont.className} absolute -top-4 right-0 z-10 hidden rotate-[-8deg] text-[22px] leading-[1.05] font-semibold text-[#49564e] xl:block`}
            >
              <p>Good</p>
              <p>Creators</p>
              <p className="relative">
                Brighter
                <svg
                  viewBox="0 0 24 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  className="absolute top-0.5 -right-8 h-4 w-6"
                  aria-hidden
                >
                  <path d="M5 16 9 5" />
                  <path d="M12 17 16 6" />
                  <path d="M19 18 23 7" />
                </svg>
              </p>
              <p>Tomorrow</p>
            </div>

            <PricingTable />
          </div>

          <Reveal>
            <div className="mt-14 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <KakaoSignInButton label="지금 시작하기 →" className={CTA_ON_LIGHT} />
              <Button
                variant="outline"
                size="lg"
                className="h-[56px] w-auto rounded-full border-black/15 bg-white px-9 text-base font-bold text-[var(--landing-ink)] shadow-none transition-all duration-300 hover:-translate-y-0.5 hover:bg-white"
                nativeButton={false}
                render={<a href="#how-it-works">서비스 소개 보기</a>}
              />
            </div>
            <p className="mt-4 text-center text-[13px] text-[#71806f]">
              결제 기능은 아직 준비 중입니다. 지금 가입하면 정식 출시 때 가장
              먼저 안내드릴게요.
            </p>
          </Reveal>

          <div className="mt-16 border-t border-black/[0.06] pt-12">
            <HighlightPills items={HERO_HIGHLIGHTS} />
          </div>
        </div>
      </section>

      {/* ── 상세 비교표 ─────────────────────────────────────────── */}
      <section className="px-6 pb-20 md:pb-28">
        <div className="mx-auto max-w-[1240px]">
          <Reveal>
            <LandingComparisonTable />
          </Reveal>

          <Reveal>
            <div className="mt-12 flex flex-col items-center gap-4 text-center">
              <KakaoSignInButton label="지금 시작하기 →" className={CTA_ON_LIGHT} />
              <p className="text-[13px] text-[#71806f]">
                결제 기능은 아직 준비 중입니다. 지금 가입하면 정식 출시 때 가장
                먼저 안내드릴게요.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── 왜 필요한가 + 마무리 CTA ─────────────────────────────── */}
      <section className="px-6 pb-8 md:pb-12">
        <div className="mx-auto max-w-[1240px]">
          <Reveal>
            <div className="mx-auto mb-14 flex max-w-3xl flex-col items-center gap-5 text-center">
              <EyebrowBadge icon={Users2}>크리에이터의 더 안전한 내일을 위해</EyebrowBadge>
              <h2 className="text-[clamp(32px,4.5vw,54px)] leading-[1.14] font-extrabold tracking-[-0.02em] text-[var(--landing-ink)] break-keep">
                구독자가 늘수록,
                <br />
                댓글창은 혼자 감당하기 버거워집니다
              </h2>
              <p className="text-[15px] leading-relaxed text-[#5b6a61] sm:text-base">
                소속사나 법무팀 없이 채널을 운영하는
                크리에이터를 위해 만들어졌습니다.{" "}
                <br className="hidden sm:inline" />
                매번 댓글창을 직접 훑어보지 않아도, 위험한 댓글은 자동으로
                걸러서 보여드려요.
              </p>
            </div>
          </Reveal>

          <div className="mb-20 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURE_CARDS.map((feature, index) => {
              // 컬러 로테이션 — 라임·포레스트 카드가 하나씩 섞여 스티커 보드 느낌을 낸다
              const tone = [
                "bg-white ring-1 ring-black/[0.05]",
                "bg-[var(--landing-lime)]",
                "bg-[var(--landing-forest)]",
                "bg-white ring-1 ring-black/[0.05]",
              ][index];
              const isForest = tone.includes("--landing-forest");

              return (
                <Reveal key={feature.title} delay={index * 100} className="h-full">
                  <div
                    className={`flex h-full flex-col rounded-[2rem] p-7 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_30px_60px_-30px_rgba(20,33,27,0.4)] ${tone}`}
                  >
                    <span
                      className={`flex size-13 items-center justify-center rounded-2xl ${
                        isForest
                          ? "bg-[var(--landing-lime)] text-[var(--landing-ink)]"
                          : "bg-[var(--landing-ink)] text-[var(--landing-lime)]"
                      }`}
                    >
                      <feature.icon className="size-6" />
                    </span>
                    <p
                      className={`mt-6 text-lg font-extrabold ${
                        isForest ? "text-white" : "text-[var(--landing-ink)]"
                      }`}
                    >
                      {feature.title}
                    </p>
                    <p
                      className={`mt-2.5 text-sm leading-relaxed ${
                        isForest ? "text-white/70" : "text-[#5b6a61]"
                      }`}
                    >
                      {feature.body}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 마무리 CTA: 딥그린 포스터 블록 ───────────────────────── */}
      <section className="px-3 pb-20 sm:px-4 md:pb-28">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] bg-[var(--landing-forest)] px-6 py-20 sm:rounded-[2.75rem] md:py-28">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-40 right-[10%] size-[420px] rounded-full bg-[var(--landing-forest-deep)] opacity-80 blur-[90px]"
            />

            <div
              aria-hidden
              className={`${handwritingFont.className} absolute top-1/2 right-12 hidden -translate-y-1/2 rotate-[-8deg] text-2xl leading-[1.1] font-semibold text-[var(--landing-lime)] lg:block`}
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
                  className="absolute top-1 -right-8 h-4 w-6"
                  aria-hidden
                >
                  <path d="M5 16 9 5" />
                  <path d="M12 17 16 6" />
                </svg>
              </p>
              <p>Tomorrow</p>
            </div>

            <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
              <p className="text-[13px] font-extrabold tracking-wide text-[var(--landing-lime)]">
                지금, 더 안전한 창작 활동을 시작하세요
              </p>
              <h2 className="mt-4 text-[clamp(30px,4.5vw,54px)] leading-[1.14] font-extrabold tracking-[-0.02em] text-white break-keep">
                좋은 크리에이터의 내일을 함께 만듭니다
              </h2>
              <p className="mt-4 text-[15px] text-white/70 sm:text-base">
                지금 바로 Reevely와 함께 더 건강한 커뮤니티를 만들어보세요.
              </p>

              <div className="mt-9 flex flex-col items-center gap-3">
                <KakaoSignInButton
                  label="무료로 시작하기 →"
                  className={CTA_ON_DARK}
                />
                <p className="text-xs text-white/50">
                  카카오 로그인 후 유튜브 채널을 연동합니다.
                </p>
              </div>
            </div>
          </div>
        </Reveal>

        <div className="mx-auto mt-16 max-w-[1240px]">
          <HighlightPills items={CLOSING_HIGHLIGHTS} />
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
