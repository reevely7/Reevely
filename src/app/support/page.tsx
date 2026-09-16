import { Check } from "lucide-react";

import { SiteFooter } from "@/components/landing/site-footer";
import { MarketingHeroShell } from "@/components/marketing/marketing-hero-shell";
import { SupportHelpCenter } from "@/components/marketing/support-help-center";
import { WorkspacePhotoCard } from "@/components/marketing/workspace-photo-card";

export default function SupportPage() {
  return (
    <main className="font-pretendard flex flex-1 flex-col bg-[#f8f8f8]">
      <MarketingHeroShell>
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-10">
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <span className="landing-rise inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[13px] font-semibold text-white backdrop-blur-sm">
              <Check className="size-3.5 text-[var(--landing-lime)]" />
              Customer Support
            </span>
            <h1 className="landing-rise mt-6 text-[clamp(32px,5.5vw,56px)] leading-[1.15] font-extrabold tracking-[-0.02em] text-white break-keep">
              무엇을 도와드릴까요?
            </h1>
            <p className="landing-rise mt-6 max-w-md text-[15px] leading-relaxed text-white/75">
              Reevely 이용 중 궁금한 내용을 빠르게 찾아보세요.
            </p>
          </div>

          <WorkspacePhotoCard imageSrc="/marketing/support-lifebuoy.png" />
        </div>
      </MarketingHeroShell>

      <SupportHelpCenter />

      <SiteFooter />
    </main>
  );
}
