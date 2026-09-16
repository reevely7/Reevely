import { MarketingHeader } from "@/components/marketing/marketing-header";

// 회사소개·제휴제안·고객센터 히어로가 공유하는 옅은 세이지 그라데이션
// 배경 + 블롭 + 헤더 껍데기. 히어로 본문은 children으로 받는다.
export function MarketingHeroShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="font-pretendard relative overflow-hidden bg-[linear-gradient(168deg,#ffffff_0%,#f6f9f6_45%,#eaf2ec_100%)]">
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

      <MarketingHeader />

      <section className="relative mx-auto w-full max-w-[1200px] px-6 pt-4 pb-16 md:pb-20">
        {children}
      </section>
    </div>
  );
}
