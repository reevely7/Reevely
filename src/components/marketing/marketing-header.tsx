import Image from "next/image";
import Link from "next/link";

import { KakaoSignInButton } from "@/components/auth/kakao-sign-in-button";
import { MarketingMobileNav } from "@/components/marketing/marketing-mobile-nav";

// 회사소개·제휴제안·고객센터 등 서브페이지에서 공통으로 쓰는 헤더.
// 랜딩 히어로 헤더와 완전히 같은 톤(딥그린 배경 위 화이트/라임)을 쓰되,
// 이 페이지들은 앵커가 아니라 홈의 섹션으로 링크한다.
export function MarketingHeader() {
  return (
    <header className="relative z-20 mx-auto flex w-full max-w-[1240px] items-center justify-between px-6 py-6 sm:px-8">
      <Link href="/" className="flex items-center gap-2.5">
        <Image src="/icon.png" alt="" width={32} height={32} className="size-8" />
        <span className="relative top-0.5 text-xl font-extrabold tracking-tight text-white">
          Reevely
        </span>
      </Link>
      <nav className="hidden items-center gap-2 md:flex">
        <Link
          href="/#how-it-works"
          className="rounded-full px-4 py-2 text-[15px] font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          서비스 소개
        </Link>
        <Link
          href="/#pricing"
          className="rounded-full px-4 py-2 text-[15px] font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          요금제
        </Link>
      </nav>
      <div className="flex items-center gap-2">
        <MarketingMobileNav />
        <Link
          href="/login"
          className="hidden rounded-full border border-white/25 px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-white hover:text-[var(--landing-ink)] md:inline-block"
        >
          로그인
        </Link>
        <KakaoSignInButton
          label="무료로 시작하기 →"
          size="sm"
          className="h-9 w-auto rounded-full bg-[var(--landing-lime)] px-4 text-sm font-extrabold text-[var(--landing-ink)] shadow-none transition-colors hover:bg-white"
        />
      </div>
    </header>
  );
}
