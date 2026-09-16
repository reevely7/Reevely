import {
  BarChart3,
  FlaskConical,
  Gift,
  Layers,
  Link2,
  Mail,
  Megaphone,
  Users2,
} from "lucide-react";
import type { ComponentType } from "react";

import { SiteFooter } from "@/components/landing/site-footer";
import { MarketingHeroShell } from "@/components/marketing/marketing-hero-shell";
import { PartnershipContactForm } from "@/components/marketing/partnership-contact-form";
import { SectionEyebrow } from "@/components/marketing/section-eyebrow";
import { WorkspacePhotoCard } from "@/components/marketing/workspace-photo-card";
import { Button } from "@/components/ui/button";
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

export default function PartnershipPage() {
  return (
    <main className="flex flex-1 flex-col">
      <MarketingHeroShell>
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-10">
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <SectionEyebrow>Partnership</SectionEyebrow>
            <h1 className="mt-4 text-[32px] leading-[1.25] font-extrabold tracking-tight text-[#111111] break-keep sm:text-[40px]">
              크리에이터를 더 안전하게 보호하는 방법을 함께 만들고 싶습니다.
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-[#4b5a51]">
              MCN, 플랫폼, 크리에이터 커뮤니티와 함께 더 건강한 콘텐츠
              환경을 만들어갑니다.
            </p>

            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
              <Button
                size="lg"
                className="h-[52px] w-auto rounded-xl px-8 text-base font-semibold shadow-lg shadow-primary/25"
                nativeButton={false}
                render={<a href="#proposal-form">제휴 문의하기 →</a>}
              />
              <Button
                variant="outline"
                size="lg"
                className="h-[52px] w-auto gap-1.5 rounded-xl border-[#e0e6e1] bg-white px-8 text-base font-semibold text-[#1e2d26] shadow-sm hover:bg-white hover:shadow-md"
                nativeButton={false}
                render={
                  <a href={`mailto:${CONTACT_EMAILS.partnership}`}>
                    <Mail className="size-4" />
                    이메일로 제안하기
                  </a>
                }
              />
            </div>
          </div>

          <WorkspacePhotoCard
            note={["좋은 창작 생태계를", "함께 만들어가요."]}
          />
        </div>

        <div className="mt-16 grid gap-5 sm:grid-cols-3">
          {AUDIENCES.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-black/[0.06] bg-white px-6 py-6 shadow-sm"
            >
              <span className="flex size-11 items-center justify-center rounded-full bg-[#e4efe6] text-primary">
                <item.icon className="size-5" />
              </span>
              <p className="mt-4 text-[15px] font-extrabold text-[#16241d]">
                {item.title}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-[#5b6a61]">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </MarketingHeroShell>

      {/* COLLABORATION */}
      <section className="bg-background px-6 py-16 md:py-24">
        <div className="mx-auto max-w-[1200px]">
          <SectionEyebrow>Collaboration</SectionEyebrow>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#111111] break-keep">
            이런 협업이 가능합니다
          </h2>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[#5b6a61]">
            각 파트너의 특성에 맞는 방식으로 유연하게 협업할 수 있습니다.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {COLLABORATIONS.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-black/[0.06] bg-white px-5 py-6 shadow-sm"
              >
                <span className="flex size-10 items-center justify-center rounded-full bg-[#e4efe6] text-primary">
                  <item.icon className="size-4.5" />
                </span>
                <p className="mt-3.5 text-sm font-extrabold text-[#16241d]">
                  {item.title}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-[#5b6a61]">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GET IN TOUCH */}
      <section id="proposal-form" className="bg-background px-6 pb-16 md:pb-24">
        <div className="mx-auto max-w-3xl">
          <PartnershipContactForm />
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
