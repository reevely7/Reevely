import {
  ArrowRight,
  Bell,
  Check,
  Eye,
  Heart,
  Link2,
  Lock,
  MessageSquare,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import type { ComponentType } from "react";

import { KakaoSignInButton } from "@/components/auth/kakao-sign-in-button";
import { CTA_ON_DARK } from "@/components/landing/cta-styles";
import { EyebrowBadge } from "@/components/landing/eyebrow-badge";
import { Reveal } from "@/components/landing/reveal";
import { SiteFooter } from "@/components/landing/site-footer";
import { YoutubeIcon } from "@/components/icons/youtube-icon";
import { AboutHeroPreview } from "@/components/marketing/about-hero-preview";
import { MarketingHeroShell } from "@/components/marketing/marketing-hero-shell";
import { WorkspacePhotoCard } from "@/components/marketing/workspace-photo-card";

const PILLARS: Array<{
  icon: ComponentType<{ className?: string }>;
  title: string;
  body: string;
}> = [
  {
    icon: Sparkles,
    title: "AI가 먼저 읽습니다",
    body: "쏟아지는 댓글을 AI가 먼저 분석해 유해한 댓글을 자동으로 선별합니다.",
  },
  {
    icon: Eye,
    title: "필요한 것만 보여드립니다",
    body: "중요한 댓글과 소통이 필요한 내용만 한눈에 확인할 수 있습니다.",
  },
  {
    icon: Lock,
    title: "판단은 신중하게 합니다",
    body: "AI가 확신하지 못한 댓글은 별도로 분리해 오탐을 최소화합니다.",
  },
];

const HOW_IT_WORKS: Array<{
  icon: ComponentType<{ className?: string }>;
  title: string;
  body: string;
}> = [
  {
    icon: Link2,
    title: "채널 연동",
    body: "유튜브 채널을 공식 API로 안전하게 연동합니다.",
  },
  {
    icon: MessageSquare,
    title: "댓글 수집",
    body: "업로드되는 댓글을 일정 시간마다 자동 수집합니다.",
  },
  {
    icon: Sparkles,
    title: "AI 분석",
    body: "AI가 댓글의 위험도를 분석해 판정 근거를 남깁니다.",
  },
  {
    icon: Bell,
    title: "필요한 정보 전달",
    body: "중요한 댓글만 걸러내어 대시보드에 보여줍니다.",
  },
];

export default function AboutPage() {
  return (
    <main className="font-pretendard flex flex-1 flex-col bg-[#f8f8f8]">
      <MarketingHeroShell>
        <div className="grid items-center gap-14 lg:grid-cols-[1fr_1fr] lg:gap-10">
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <span className="landing-rise inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[13px] font-semibold text-white backdrop-blur-sm">
              <Check className="size-3.5 text-[var(--landing-lime)]" />
              For Creators
            </span>
            <h1 className="landing-rise mt-6 text-[clamp(32px,5.5vw,56px)] leading-[1.15] font-extrabold tracking-[-0.02em] text-white break-keep">
              좋은 콘텐츠가
              <br />더 멀리, 더 오래 가도록.
            </h1>
            <p className="landing-rise mt-6 max-w-md text-[15px] leading-relaxed text-white/75">
              Reevely는 크리에이터를 위한 AI 댓글 관리 서비스입니다. 불필요한
              걱정은 덜고, 콘텐츠에만 집중할 수 있는 더 건강한 환경을
              만들어갑니다.
            </p>

            <div className="landing-rise mt-8 flex flex-col items-center gap-3 sm:flex-row">
              <KakaoSignInButton
                label="무료로 시작하기 →"
                className={CTA_ON_DARK}
              />
              <Link
                href="/#how-it-works"
                className="inline-flex h-[56px] items-center gap-1.5 px-4 text-base font-bold text-white/80 transition-colors hover:text-white"
              >
                서비스 더 알아보기 <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>

          <div className="relative flex justify-center lg:justify-end">
            <AboutHeroPreview />
          </div>
        </div>
      </MarketingHeroShell>

      {/* PILLARS */}
      <section className="px-6 py-16 md:py-24">
        <div className="mx-auto grid max-w-[1200px] gap-5 sm:grid-cols-3">
          {PILLARS.map((pillar, index) => (
            <Reveal key={pillar.title} delay={index * 100} className="h-full">
              <div className="flex h-full flex-col rounded-[2rem] bg-white p-7 ring-1 ring-black/[0.05] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_30px_60px_-30px_rgba(20,33,27,0.35)]">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-[var(--landing-ink)] text-[var(--landing-lime)]">
                  <pillar.icon className="size-5" />
                </span>
                <p className="mt-5 text-lg font-extrabold text-[var(--landing-ink)]">
                  {pillar.title}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[#5b6a61]">
                  {pillar.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* OUR WHY */}
      <section className="px-6 pb-16 md:pb-24">
        <div className="mx-auto grid max-w-[1200px] items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <EyebrowBadge icon={Heart}>Our Why</EyebrowBadge>
            <h2 className="mt-4 text-[clamp(28px,3.5vw,40px)] leading-[1.15] font-extrabold tracking-[-0.02em] text-[var(--landing-ink)] break-keep">
              왜 Reevely를 만들었나요?
            </h2>
            <p className="mt-5 text-[15px] leading-relaxed text-[#5b6a61]">
              구독자가 늘어날수록, 저희도 함께 크리에이터의 고민을 가까이에서
              지켜봤습니다. 하지만 수많은 댓글 속에는 응원의 있는 것이
              아니라, 때로는 크리에이터의 마음을 상하게 하는 수많은 악성
              댓글도 있었습니다.
            </p>
            <p className="mt-4 text-[15px] leading-relaxed text-[#5b6a61]">
              Reevely는 이러한 부담을 줄이고, 크리에이터가 더 안전하게 창작
              활동에 집중할 수 있는 환경을 만들기 위해 시작되었습니다.
            </p>
          </Reveal>
          <Reveal delay={100}>
            <WorkspacePhotoCard
              imageSrc="/marketing/about-shield.png"
              note={["Better Creators", "Brighter", "Tomorrows"]}
            />
          </Reveal>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="px-6 pb-16 md:pb-24">
        <div className="mx-auto max-w-[1200px]">
          <Reveal>
            <EyebrowBadge icon={Sparkles}>How It Works</EyebrowBadge>
            <h2 className="mt-4 text-[clamp(28px,3.5vw,40px)] leading-[1.15] font-extrabold tracking-[-0.02em] text-[var(--landing-ink)] break-keep">
              Reevely는 이렇게 작동합니다
            </h2>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[#5b6a61]">
              복잡한 설정 없이, 몇 번의 클릭만으로 시작할 수 있습니다.
            </p>
          </Reveal>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map((step, index) => (
              <Reveal key={step.title} delay={index * 100} className="h-full">
                <div
                  className={`group flex h-full flex-col gap-2 rounded-[2rem] bg-white p-6 ring-1 ring-black/[0.05] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_30px_60px_-30px_rgba(20,33,27,0.35)] ${
                    index % 2 === 0 ? "lg:rotate-[-1.2deg]" : "lg:rotate-[1.2deg]"
                  } lg:hover:rotate-0`}
                >
                  <span className="inline-flex size-9 rotate-[-6deg] items-center justify-center self-start rounded-xl bg-[var(--landing-ink)] text-[12px] font-extrabold text-[var(--landing-lime)] transition-transform duration-300 group-hover:rotate-6">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="mt-2 flex size-9 items-center justify-center rounded-xl bg-[#e4efe6] text-[#3e6856]">
                    <step.icon className="size-4.5" />
                  </span>
                  <p className="mt-1 text-[15px] font-extrabold text-[var(--landing-ink)]">
                    {step.title}
                  </p>
                  <p className="text-sm leading-relaxed text-[#5b6a61]">
                    {step.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST & SAFETY */}
      <section className="px-6 pb-20 md:pb-28">
        <div className="mx-auto max-w-[1200px]">
          <Reveal>
            <EyebrowBadge icon={ShieldCheck}>Trust &amp; Safety</EyebrowBadge>
            <h2 className="mt-4 text-[clamp(28px,3.5vw,40px)] leading-[1.15] font-extrabold tracking-[-0.02em] text-[var(--landing-ink)] break-keep">
              안전하고 투명하게 운영합니다
            </h2>
          </Reveal>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <Reveal>
              <div className="flex h-full items-start gap-4 rounded-[2rem] bg-white p-7 ring-1 ring-black/[0.05]">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--landing-ink)] text-[var(--landing-lime)]">
                  <YoutubeIcon className="size-5" />
                </span>
                <div>
                  <p className="text-[15px] font-extrabold text-[var(--landing-ink)]">
                    공식 API 기반 연동
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#5b6a61]">
                    유튜브의 공식 API를 사용해 안전하게 연동합니다. 별도의
                    아이디·비밀번호를 저장하지 않습니다.
                  </p>
                </div>
              </div>
            </Reveal>
            <Reveal delay={100}>
              <div className="flex h-full items-start gap-4 rounded-[2rem] bg-[var(--landing-forest)] p-7">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--landing-lime)] text-[var(--landing-ink)]">
                  <Lock className="size-5" />
                </span>
                <div>
                  <p className="text-[15px] font-extrabold text-white">
                    개인정보 처리 원칙
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/70">
                    댓글 작성자의 개인정보는 최소한으로만 수집하며, 자세한
                    내용은{" "}
                    <a
                      href="/privacy"
                      className="text-[var(--landing-lime)] underline underline-offset-2"
                    >
                      개인정보처리방침
                    </a>
                    에서 확인할 수 있습니다.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
