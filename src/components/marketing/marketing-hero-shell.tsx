import { MarketingHeader } from "@/components/marketing/marketing-header";

// 회사소개·제휴제안·고객센터 히어로가 공유하는 풀블리드 딥그린 포스터
// 블록 — 랜딩 히어로와 같은 톤(배경·블롭·헤더)이다. 히어로 본문은
// children으로 받는다.
export function MarketingHeroShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="font-pretendard relative overflow-hidden bg-[var(--landing-forest)]">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -right-32 size-[560px] rounded-full bg-[var(--landing-forest-deep)] opacity-80 blur-[100px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-48 -left-32 size-[520px] rounded-full bg-[#3a6d58] opacity-60 blur-[110px]"
      />

      <MarketingHeader />

      <section className="relative z-10 mx-auto w-full max-w-[1240px] px-6 pt-6 pb-16 sm:px-8 md:pt-10 md:pb-20">
        {children}
      </section>
    </div>
  );
}
