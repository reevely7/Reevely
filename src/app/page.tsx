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
import { Fragment } from "react";

import { KakaoSignInButton } from "@/components/auth/kakao-sign-in-button";
import { EyebrowBadge } from "@/components/landing/eyebrow-badge";
import { HeroDashboardPreview } from "@/components/landing/hero-dashboard-preview";
import { LandingMobileNav } from "@/components/landing/landing-mobile-nav";
import { SiteFooter } from "@/components/landing/site-footer";
import {
  AiJudgeVisual,
  ConnectChannelVisual,
  DashboardVisual,
  WatchCommentsVisual,
} from "@/components/landing/step-icons";
import { Button } from "@/components/ui/button";
import {
  PlanComparisonTable,
  PricingTable,
} from "@/components/landing/pricing-table";
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
    visual: ConnectChannelVisual,
  },
  {
    title: "댓글을 조용히 지켜봐요",
    body: "새 영상이 올라오면 1시간마다, 없으면 6시간마다 댓글을 확인합니다. 실시간은 아니지만, 계속 지켜보고 있어요.",
    visual: WatchCommentsVisual,
  },
  {
    title: "AI가 위험도를 판정해요",
    body: "댓글 하나하나를 분석해 위험도와 유형, 판정 근거를 함께 남깁니다.",
    visual: AiJudgeVisual,
  },
  {
    title: "대시보드에서 확인해요",
    body: "위험도별로 정리된 화면에서 확인하고, 필요하면 숨김 처리나 오탐 신고를 한 번으로 끝낼 수 있어요.",
    visual: DashboardVisual,
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
    <main className="font-pretendard flex flex-1 flex-col">
      {/* 헤더 + 히어로 — 옅은 세이지 그라데이션 배경을 공유하고, 목업이
          오른쪽 화면 끝에서 잘리도록 이 래퍼에서 overflow를 자른다 */}
      <div className="font-pretendard relative overflow-hidden bg-[linear-gradient(168deg,#ffffff_0%,#f6f9f6_45%,#eaf2ec_100%)]">
        {/* 유기적인 배경 블롭 */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-44 right-[-14%] size-[620px] rounded-full bg-[#dceade] opacity-70 blur-[110px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-24 right-[2%] size-[440px] rounded-full bg-[#cfe2d4] opacity-60 blur-[100px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-48 left-[-12%] size-[520px] rounded-full bg-[#e6efe7] opacity-80 blur-[110px]"
        />

        {/* 상단 내비게이션 */}
        <header className="relative z-10 mx-auto flex w-full max-w-[1200px] items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2">
            <Image
              src="/logo-mark.png"
              alt=""
              width={36}
              height={36}
              className="size-9"
            />
            <span
              className={`${wordmarkFont.className} relative top-0.5 text-xl font-extrabold tracking-tight text-[#16241d]`}
            >
              Reevely
            </span>
          </div>
          <nav className="hidden items-center gap-8 text-[15px] font-medium text-[#3d4a43] md:flex">
            <a href="#how-it-works" className="hover:text-[#111]">
              서비스 소개
            </a>
            <a href="#pricing" className="hover:text-[#111]">
              요금제
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <LandingMobileNav />
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-auto px-3 text-sm text-[#3d4a43]"
              nativeButton={false}
              render={<a href="/login">로그인</a>}
            />
          </div>
        </header>

        {/* 히어로 */}
        <section className="relative mx-auto w-full max-w-[1200px] px-6 pt-8 pb-12 md:pt-12 md:pb-14">
          <div className="grid items-center gap-14 lg:grid-cols-[45fr_55fr] lg:gap-4">
            {/* 좌측 텍스트 */}
            <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#e4efe6] px-4 py-2 text-[13px] font-semibold text-primary">
                <Check className="size-3.5" />
                크리에이터의 더 안전한 내일을 위해
              </span>

              <h1 className="mt-6 text-[38px] leading-[1.18] font-extrabold tracking-tight text-[#111111] sm:text-[52px] lg:text-[64px]">
                좋은 크리에이터의
                <br />
                내일을 지킵니다
              </h1>

              <p className="mt-6 max-w-[430px] text-base leading-relaxed text-[#4b5a51] lg:text-[17px]">
                Reevely는 악성 댓글로부터 크리에이터를 보호하고,{" "}
                <br className="hidden sm:inline" />
                더 건강한 커뮤니티 문화를 만들어가는{" "}
                <br className="hidden sm:inline" />
                AI 기반 댓글 관리 솔루션입니다.
              </p>

              {errorMessage && (
                <p className="mt-4 rounded-md bg-risk-high-bg px-3 py-2 text-xs text-risk-high">
                  {errorMessage}
                </p>
              )}

              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
                <KakaoSignInButton
                  label="무료로 시작하기 →"
                  className="h-[52px] w-auto rounded-xl px-8 text-base font-semibold shadow-lg shadow-primary/25"
                />
                <Button
                  variant="outline"
                  size="lg"
                  className="h-[52px] w-auto rounded-xl border-[#e0e6e1] bg-white px-8 text-base font-semibold text-[#1e2d26] shadow-sm hover:bg-white hover:shadow-md"
                  nativeButton={false}
                  render={<a href="#how-it-works">서비스 소개 보기</a>}
                />
              </div>
            </div>

            {/* 우측 대시보드 목업 — 컨테이너 오른쪽 밖으로 튀어나가 화면 끝에서 잘린다 */}
            <div className="relative flex justify-center lg:-mr-44 lg:justify-start lg:pl-4">
              <HeroDashboardPreview />
            </div>
          </div>

          {/* 하단 기능 3개 */}
          <div className="mt-14 flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-14">
            {HERO_HIGHLIGHTS.map((item) => (
              <div key={item.title} className="flex items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#e4efe6] text-primary">
                  <item.icon className="size-5" />
                </span>
                <div>
                  <p className="text-[15px] font-bold text-[#16241d]">
                    {item.title}
                  </p>
                  <p className="text-[13px] text-[#71806f]">{item.caption}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* 동작 원리 */}
      <section id="how-it-works" className="bg-background px-6 py-16 md:py-24">
        <div className="mx-auto max-w-[1200px]">
          <div className="mx-auto mb-12 flex max-w-2xl flex-col items-center gap-4 text-center">
            <EyebrowBadge icon={Leaf}>간단한 설정으로 더 안전한 커뮤니티</EyebrowBadge>
            <h2 className="text-3xl font-extrabold tracking-tight text-[#111111] break-keep sm:text-4xl">
              이렇게 동작해요
            </h2>
            <p className="text-[15px] leading-relaxed text-[#5b6a61]">
              복잡한 설정 없이, 4단계만으로 채널의 댓글을 AI가 실시간으로
              모니터링합니다.{" "}
              <br className="hidden sm:inline" />
              지금 바로 시작해보세요.
            </p>
          </div>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-0">
            {STEPS.map((step, index) => (
              <Fragment key={step.title}>
                <div className="flex flex-1 flex-col rounded-2xl border border-black/[0.06] bg-white px-6 pt-6 pb-7 text-left shadow-sm">
                  <span className="flex size-9 items-center justify-center rounded-full bg-[#e4efe6] text-[13px] font-bold text-primary">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <step.visual />
                  <p className="mt-3 text-[17px] font-extrabold text-[#16241d]">
                    {step.title}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-[#5b6a61]">
                    {step.body}
                  </p>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    aria-hidden
                    className="hidden shrink-0 items-center justify-center px-2.5 lg:flex"
                  >
                    <div className="flex gap-1">
                      <span className="size-1 rounded-full bg-[#c9d4cb]" />
                      <span className="size-1 rounded-full bg-[#c9d4cb]" />
                      <span className="size-1 rounded-full bg-[#c9d4cb]" />
                    </div>
                  </div>
                )}
              </Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* 오탐 관리 원칙 */}
      <section className="bg-background px-6 pb-16 md:pb-24">
        <div className="relative mx-auto max-w-[1200px] overflow-hidden rounded-3xl bg-[#e9f2ea] px-8 py-14 text-center">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -left-24 size-72 rounded-full bg-white/50 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -bottom-24 size-72 rounded-full bg-white/40 blur-3xl"
          />
          <div className="relative flex flex-col items-center gap-5">
            <EyebrowBadge tone="white" icon={ShieldCheck}>
              오탐 관리 원칙
            </EyebrowBadge>
            <h2 className="text-3xl font-extrabold tracking-tight text-[#111111] break-keep sm:text-4xl">
              확신 없는 판정은, 확정하지 않습니다
            </h2>
            <p className="max-w-2xl text-[15px] leading-relaxed text-[#4b5a51]">
              AI가 확신하지 못한 댓글(confidence 0.7 미만)은 자동으로 확정하지
              않고{" "}
              <br className="hidden sm:inline" />
              별도의 검토 큐로 분리합니다. 잘못된 확정보다, 사람이 한 번 더
              확인하는 쪽을 택했습니다.
            </p>
          </div>
        </div>
      </section>

      {/* 요금제 카드 */}
      <section id="pricing" className="bg-background px-6 py-16 md:py-24">
        <div className="mx-auto max-w-[1200px]">
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

          <div className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <KakaoSignInButton
              label="지금 시작하기 →"
              className="h-[52px] w-auto rounded-xl px-10 text-base font-semibold shadow-lg shadow-primary/25"
            />
            <Button
              variant="outline"
              size="lg"
              className="h-[52px] w-auto rounded-xl border-[#e0e6e1] bg-white px-10 text-base font-semibold text-[#1e2d26] shadow-sm hover:bg-white hover:shadow-md"
              nativeButton={false}
              render={<a href="#how-it-works">서비스 소개 보기</a>}
            />
          </div>
          <p className="mt-4 text-center text-[13px] text-[#71806f]">
            결제 기능은 아직 준비 중입니다. 지금 가입하면 정식 출시 때 가장
            먼저 안내드릴게요.
          </p>

          <div className="mt-14 flex flex-col gap-6 border-t border-black/[0.06] pt-10 sm:flex-row sm:justify-center sm:gap-0 sm:divide-x sm:divide-black/[0.06]">
            {HERO_HIGHLIGHTS.map((item) => (
              <div
                key={item.title}
                className="flex items-center justify-center gap-3 sm:px-10 lg:px-14"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#e4efe6] text-primary">
                  <item.icon className="size-4.5" />
                </span>
                <div>
                  <p className="text-sm font-bold text-[#16241d]">
                    {item.title}
                  </p>
                  <p className="text-[13px] text-[#71806f]">{item.caption}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 상세 비교표 */}
      <section className="bg-background px-6 pb-16 md:pb-24">
        <div className="mx-auto max-w-[1200px]">
          <PlanComparisonTable showHeader />

          <div className="mt-10 flex flex-col items-center gap-4 text-center">
            <KakaoSignInButton
              label="지금 시작하기 →"
              className="h-[52px] w-auto rounded-xl px-10 text-base font-semibold shadow-lg shadow-primary/25"
            />
            <p className="text-[13px] text-[#71806f]">
              결제 기능은 아직 준비 중입니다. 지금 가입하면 정식 출시 때 가장
              먼저 안내드릴게요.
            </p>
          </div>
        </div>
      </section>

      {/* 왜 필요한가 + 마무리 CTA */}
      <section className="bg-background px-6 py-16 md:py-24">
        <div className="mx-auto max-w-[1200px]">
          <div className="mx-auto mb-12 flex max-w-3xl flex-col items-center gap-4 text-center">
            <EyebrowBadge icon={Users2}>크리에이터의 더 안전한 내일을 위해</EyebrowBadge>
            <h2 className="text-3xl leading-snug font-extrabold tracking-tight text-[#111111] break-keep sm:text-4xl">
              구독자가 늘수록,
              <br />
              댓글창은 혼자 감당하기 버거워집니다
            </h2>
            <p className="text-[15px] leading-relaxed text-[#5b6a61]">
              소속사나 법무팀 없이 채널을 운영하는
              크리에이터를 위해 만들어졌습니다.{" "}
              <br className="hidden sm:inline" />
              매번 댓글창을 직접 훑어보지 않아도, 위험한 댓글은 자동으로
              걸러서 보여드려요.
            </p>
          </div>

          <div className="mb-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURE_CARDS.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-black/[0.06] bg-white px-6 py-7 text-left shadow-sm"
              >
                <span className="flex size-14 items-center justify-center rounded-full bg-[#e4efe6] text-primary">
                  <feature.icon className="size-6" />
                </span>
                <p className="mt-5 text-[17px] font-extrabold text-[#16241d]">
                  {feature.title}
                </p>
                <p className="mt-2.5 text-sm leading-relaxed text-[#5b6a61]">
                  {feature.body}
                </p>
              </div>
            ))}
          </div>

          <div className="relative overflow-hidden rounded-3xl bg-[#e9f2ea] px-8 py-14 text-center">
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-32 -left-24 size-96 rounded-full bg-white/50 blur-3xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -top-24 right-1/4 size-64 rounded-full bg-white/40 blur-3xl"
            />

            <div
              aria-hidden
              className={`${handwritingFont.className} absolute top-1/2 right-10 hidden -translate-y-1/2 rotate-[-8deg] text-2xl leading-[1.1] font-semibold text-[#49564e] lg:block`}
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

            <div className="relative">
              <p className="text-[13px] font-bold text-primary">
                지금, 더 안전한 창작 활동을 시작하세요
              </p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#111111] break-keep sm:text-4xl">
                좋은 크리에이터의 내일을 함께 만듭니다
              </h2>
              <p className="mt-3 text-[15px] text-[#4b5a51]">
                지금 바로 Reevely와 함께 더 건강한 커뮤니티를 만들어보세요.
              </p>

              <div className="mt-7 flex flex-col items-center gap-3">
                <KakaoSignInButton
                  label="무료로 시작하기 →"
                  className="h-[52px] w-auto rounded-xl px-10 text-base font-semibold shadow-lg shadow-primary/25"
                />
                <p className="text-xs text-[#71806f]">
                  카카오 로그인 후 유튜브 채널을 연동합니다.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-14 flex flex-col gap-6 border-t border-black/[0.06] pt-10 sm:flex-row sm:justify-center sm:gap-0 sm:divide-x sm:divide-black/[0.06]">
            {CLOSING_HIGHLIGHTS.map((item) => (
              <div
                key={item.title}
                className="flex items-center justify-center gap-3 sm:px-10 lg:px-14"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#e4efe6] text-primary">
                  <item.icon className="size-4.5" />
                </span>
                <div>
                  <p className="text-sm font-bold text-[#16241d]">
                    {item.title}
                  </p>
                  <p className="text-[13px] text-[#71806f]">{item.caption}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
