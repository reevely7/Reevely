import { SiteFooter } from "@/components/landing/site-footer";
import { MarketingHeroShell } from "@/components/marketing/marketing-hero-shell";
import { SectionEyebrow } from "@/components/marketing/section-eyebrow";
import { SupportHelpCenter } from "@/components/marketing/support-help-center";
import { WorkspacePhotoCard } from "@/components/marketing/workspace-photo-card";

export default function SupportPage() {
  return (
    <main className="flex flex-1 flex-col">
      <MarketingHeroShell>
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-10">
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <SectionEyebrow>Customer Support</SectionEyebrow>
            <h1 className="mt-4 text-[34px] leading-[1.2] font-extrabold tracking-tight text-[#111111] break-keep sm:text-[44px]">
              무엇을 도와드릴까요?
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-[#4b5a51]">
              Reevely 이용 중 궁금한 내용을 빠르게 찾아보세요.
            </p>
          </div>

          <WorkspacePhotoCard note={["좋은 창작이", "계속될 수 있도록"]} />
        </div>
      </MarketingHeroShell>

      <SupportHelpCenter />

      <SiteFooter />
    </main>
  );
}
