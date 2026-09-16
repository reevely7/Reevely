import {
  ArrowRight,
  Bell,
  Eye,
  Link2,
  Lock,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import type { ComponentType } from "react";

import { KakaoSignInButton } from "@/components/auth/kakao-sign-in-button";
import { SiteFooter } from "@/components/landing/site-footer";
import { YoutubeIcon } from "@/components/icons/youtube-icon";
import { AboutHeroPreview } from "@/components/marketing/about-hero-preview";
import { MarketingHeroShell } from "@/components/marketing/marketing-hero-shell";
import { SectionEyebrow } from "@/components/marketing/section-eyebrow";
import { WorkspacePhotoCard } from "@/components/marketing/workspace-photo-card";
import { Button } from "@/components/ui/button";
import { handwritingFont } from "@/lib/fonts";

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
    <main className="flex flex-1 flex-col">
      <MarketingHeroShell>
        <div className="grid items-center gap-14 lg:grid-cols-[1fr_1fr] lg:gap-10">
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <SectionEyebrow>For Creators</SectionEyebrow>
            <h1 className="mt-4 text-[34px] leading-[1.2] font-extrabold tracking-tight text-[#111111] break-keep sm:text-[44px]">
              좋은 콘텐츠가
              <br />더 멀리, 더 오래 가도록.
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-[#4b5a51]">
              Reevely는 크리에이터를 위한 AI 댓글 관리 서비스입니다. 불필요한
              걱정은 덜고, 콘텐츠에만 집중할 수 있는 더 건강한 환경을
              만들어갑니다.
            </p>

            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
              <KakaoSignInButton
                label="무료로 시작하기 →"
                className="h-[52px] w-auto rounded-xl px-8 text-base font-semibold shadow-lg shadow-primary/25"
              />
              <Button
                variant="ghost"
                size="lg"
                className="h-[52px] w-auto gap-1 px-4 text-base font-semibold text-[#1e2d26]"
                nativeButton={false}
                render={
                  <Link href="/#how-it-works">
                    서비스 더 알아보기 <ArrowRight className="size-4" />
                  </Link>
                }
              />
            </div>
          </div>

          <div className="relative flex justify-center lg:justify-end">
            <div
              aria-hidden
              className={`${handwritingFont.className} absolute -top-10 -left-2 hidden rotate-[-4deg] text-lg leading-[1.15] font-semibold text-[#49564e] sm:block`}
            >
              <p>좋은 대화가</p>
              <p>계속될 수 있도록</p>
            </div>
            <AboutHeroPreview />
          </div>
        </div>

        <div className="mt-16 grid gap-5 sm:grid-cols-3">
          {PILLARS.map((pillar) => (
            <div
              key={pillar.title}
              className="rounded-2xl border border-black/[0.06] bg-white px-6 py-6 shadow-sm"
            >
              <span className="flex size-11 items-center justify-center rounded-full bg-[#e4efe6] text-primary">
                <pillar.icon className="size-5" />
              </span>
              <p className="mt-4 text-[15px] font-extrabold text-[#16241d]">
                {pillar.title}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-[#5b6a61]">
                {pillar.body}
              </p>
            </div>
          ))}
        </div>
      </MarketingHeroShell>

      {/* OUR WHY */}
      <section className="bg-background px-6 py-16 md:py-24">
        <div className="mx-auto grid max-w-[1200px] items-center gap-12 lg:grid-cols-2">
          <div>
            <SectionEyebrow>Our Why</SectionEyebrow>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#111111] break-keep">
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
          </div>
          <WorkspacePhotoCard
            note={["Better Creators", "Brighter", "Tomorrows"]}
          />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-background px-6 pb-16 md:pb-24">
        <div className="mx-auto max-w-[1200px]">
          <SectionEyebrow>How It Works</SectionEyebrow>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#111111] break-keep">
            Reevely는 이렇게 작동합니다
          </h2>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[#5b6a61]">
            복잡한 설정 없이, 몇 번의 클릭만으로 시작할 수 있습니다.
          </p>

          <div className="mt-10 flex flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-0">
            {HOW_IT_WORKS.map((step, index) => (
              <div key={step.title} className="contents">
                <div className="flex flex-1 flex-col gap-2 rounded-2xl border border-black/[0.06] bg-white px-5 py-6 shadow-sm">
                  <span className="flex size-9 items-center justify-center rounded-full bg-[#e4efe6] text-[13px] font-bold text-primary">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="mt-1 flex size-9 items-center justify-center rounded-lg bg-primary text-white">
                    <step.icon className="size-4.5" />
                  </span>
                  <p className="mt-1 text-[15px] font-extrabold text-[#16241d]">
                    {step.title}
                  </p>
                  <p className="text-sm leading-relaxed text-[#5b6a61]">
                    {step.body}
                  </p>
                </div>
                {index < HOW_IT_WORKS.length - 1 && (
                  <div
                    aria-hidden
                    className="hidden shrink-0 items-center justify-center px-3 lg:flex"
                  >
                    <ArrowRight className="size-5 text-[#a9bcae]" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST & SAFETY */}
      <section className="bg-background px-6 pb-16 md:pb-24">
        <div className="mx-auto max-w-[1200px]">
          <SectionEyebrow>Trust &amp; Safety</SectionEyebrow>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#111111] break-keep">
            안전하고 투명하게 운영합니다
          </h2>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <div className="flex items-start gap-4 rounded-2xl border border-black/[0.06] bg-white px-6 py-6 shadow-sm">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#e4efe6] text-primary">
                <YoutubeIcon className="size-5" />
              </span>
              <div>
                <p className="text-[15px] font-extrabold text-[#16241d]">
                  공식 API 기반 연동
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-[#5b6a61]">
                  유튜브의 공식 API를 사용해 안전하게 연동합니다. 별도의
                  아이디·비밀번호를 저장하지 않습니다.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 rounded-2xl border border-black/[0.06] bg-white px-6 py-6 shadow-sm">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#e4efe6] text-primary">
                <Lock className="size-5" />
              </span>
              <div>
                <p className="text-[15px] font-extrabold text-[#16241d]">
                  개인정보 처리 원칙
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-[#5b6a61]">
                  댓글 작성자의 개인정보는 최소한으로만 수집하며, 자세한 내용은{" "}
                  <a
                    href="/privacy"
                    className="text-primary underline underline-offset-2"
                  >
                    개인정보처리방침
                  </a>
                  에서 확인할 수 있습니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
