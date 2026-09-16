import {
  BarChart3,
  Check,
  FlaskConical,
  Gift,
  Layers,
  Link2,
  Mail,
  Megaphone,
  Users2,
} from "lucide-react";
import type { ComponentType } from "react";

import { CTA_ON_DARK } from "@/components/landing/cta-styles";
import { EyebrowBadge } from "@/components/landing/eyebrow-badge";
import { Reveal } from "@/components/landing/reveal";
import { SiteFooter } from "@/components/landing/site-footer";
import { MarketingHeroShell } from "@/components/marketing/marketing-hero-shell";
import { PartnershipContactForm } from "@/components/marketing/partnership-contact-form";
import { WorkspacePhotoCard } from "@/components/marketing/workspace-photo-card";
import { CONTACT_EMAILS } from "@/lib/contact";

const AUDIENCES: Array<{
  icon: ComponentType<{ className?: string }>;
  title: string;
  body: string;
}> = [
  {
    icon: Users2,
    title: "MCN·기획사",
    body: "소속 크리에이터가 더 안전하게 활동할 수 있는 환경을 함께 만듭니다.",
  },
  {
    icon: Layers,
    title: "플랫폼·서비스",
    body: "더 건강한 커뮤니티를 위한 안전한 댓글 환경을 함께 구축합니다.",
  },
  {
    icon: Megaphone,
    title: "커뮤니티·미디어",
    body: "크리에이터 보호의 중요성을 알리는 캠페인과 콘텐츠를 함께 진행합니다.",
  },
];

const COLLABORATIONS: Array<{
  icon: ComponentType<{ className?: string }>;
  title: string;
  body: string;
}> = [
  {
    icon: Link2,
    title: "서비스 연동",
    body: "자사 서비스와 Reevely를 안내하여 안전한 댓글 관리 제안을 할 수 있습니다.",
  },
  {
    icon: FlaskConical,
    title: "공동 베타 테스트",
    body: "신규 기능을 협업 대상에게 미리 공유하고 의견을 받습니다.",
  },
  {
    icon: Gift,
    title: "크리에이터 대상 제공",
    body: "소속 크리에이터나 커뮤니티에 특별 혜택을 제공할 수 있습니다.",
  },
  {
    icon: Megaphone,
    title: "공동 캠페인",
    body: "건강한 콘텐츠 환경을 위해 함께 캠페인을 기획합니다.",
  },
  {
    icon: BarChart3,
    title: "데이터 협업",
    body: "악성 댓글 트렌드 등 인사이트를 공유하며 함께 연구합니다.",
  },
];

// 5개 카드 중 일부만 라임·포레스트로 강조해 스티커 보드 느낌을 낸다
// (전부 컬러면 산만하고, 전부 화이트면 밋밋하다).
const COLLAB_TONES = [
  "bg-white ring-1 ring-black/[0.05]",
  "bg-[var(--landing-forest)]",
  "bg-white ring-1 ring-black/[0.05]",
  "bg-[var(--landing-lime)]",
  "bg-white ring-1 ring-black/[0.05]",
];

export default function PartnershipPage() {
  return (
    <main className="font-pretendard flex flex-1 flex-col bg-[#f8f8f8]">
      <MarketingHeroShell>
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-10">
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <span className="landing-rise inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[13px] font-semibold text-white backdrop-blur-sm">
              <Check className="size-3.5 text-[var(--landing-lime)]" />
              Partnership
            </span>
            <h1 className="landing-rise mt-6 text-[clamp(28px,4.5vw,46px)] leading-[1.25] font-extrabold tracking-[-0.02em] text-white break-keep">
              크리에이터를 더 안전하게 보호하는 방법을 함께 만들고 싶습니다.
            </h1>
            <p className="landing-rise mt-6 max-w-md text-[15px] leading-relaxed text-white/75">
              MCN, 플랫폼, 크리에이터 커뮤니티와 함께 더 건강한 콘텐츠
              환경을 만들어갑니다.
            </p>

            <div className="landing-rise mt-8 flex flex-col items-center gap-3 sm:flex-row">
              <a href="#proposal-form" className={`inline-flex items-center justify-center ${CTA_ON_DARK}`}>
                제휴 문의하기 →
              </a>
              <a
                href={`mailto:${CONTACT_EMAILS.partnership}`}
                className="inline-flex h-[56px] items-center gap-1.5 rounded-full border border-white/25 bg-transparent px-9 text-base font-bold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/10"
              >
                <Mail className="size-4" />
                이메일로 제안하기
              </a>
            </div>
          </div>

          <WorkspacePhotoCard imageSrc="/marketing/partnership-connect.png" />
        </div>
      </MarketingHeroShell>

      {/* AUDIENCES */}
      <section className="px-6 py-16 md:py-24">
        <div className="mx-auto grid max-w-[1200px] gap-5 sm:grid-cols-3">
          {AUDIENCES.map((item, index) => (
            <Reveal key={item.title} delay={index * 100} className="h-full">
              <div className="flex h-full flex-col rounded-[2rem] bg-white p-7 ring-1 ring-black/[0.05] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_30px_60px_-30px_rgba(20,33,27,0.35)]">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-[var(--landing-ink)] text-[var(--landing-lime)]">
                  <item.icon className="size-5" />
                </span>
                <p className="mt-5 text-lg font-extrabold text-[var(--landing-ink)]">
                  {item.title}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[#5b6a61]">
                  {item.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* COLLABORATION */}
      <section className="px-6 pb-16 md:pb-24">
        <div className="mx-auto max-w-[1200px]">
          <Reveal>
            <EyebrowBadge icon={Layers}>Collaboration</EyebrowBadge>
            <h2 className="mt-4 text-[clamp(28px,3.5vw,40px)] leading-[1.15] font-extrabold tracking-[-0.02em] text-[var(--landing-ink)] break-keep">
              이런 협업이 가능합니다
            </h2>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[#5b6a61]">
              각 파트너의 특성에 맞는 방식으로 유연하게 협업할 수 있습니다.
            </p>
          </Reveal>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {COLLABORATIONS.map((item, index) => {
              const tone = COLLAB_TONES[index];
              const isForest = tone.includes("forest");
              return (
                <Reveal key={item.title} delay={index * 80} className="h-full">
                  <div
                    className={`flex h-full flex-col rounded-[2rem] p-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_30px_60px_-30px_rgba(20,33,27,0.35)] ${tone}`}
                  >
                    <span
                      className={`flex size-10 items-center justify-center rounded-xl ${
                        isForest
                          ? "bg-[var(--landing-lime)] text-[var(--landing-ink)]"
                          : "bg-[var(--landing-ink)] text-[var(--landing-lime)]"
                      }`}
                    >
                      <item.icon className="size-4.5" />
                    </span>
                    <p
                      className={`mt-3.5 text-sm font-extrabold ${
                        isForest ? "text-white" : "text-[var(--landing-ink)]"
                      }`}
                    >
                      {item.title}
                    </p>
                    <p
                      className={`mt-1.5 text-xs leading-relaxed ${
                        isForest ? "text-white/70" : "text-[#5b6a61]"
                      }`}
                    >
                      {item.body}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* GET IN TOUCH */}
      <section id="proposal-form" className="px-6 pb-20 md:pb-28">
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <PartnershipContactForm />
          </Reveal>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
