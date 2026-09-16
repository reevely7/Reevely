import Image from "next/image";
import Link from "next/link";

import { KakaoSignInButton } from "@/components/auth/kakao-sign-in-button";
import { LandingMobileNav } from "@/components/landing/landing-mobile-nav";
import { Button } from "@/components/ui/button";
import { wordmarkFont } from "@/lib/fonts";

// 회사소개·제휴제안·고객센터 등 서브페이지에서 공통으로 쓰는 헤더.
// 랜딩 히어로 헤더와 같은 로고·톤을 쓰되, 이 페이지들은 앵커가 아니라
// 홈의 섹션으로 링크한다.
export function MarketingHeader() {
  return (
    <header className="relative z-10 mx-auto flex w-full max-w-[1200px] items-center justify-between px-6 py-5">
      <Link href="/" className="flex items-center gap-2">
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
      </Link>
      <nav className="hidden items-center gap-8 text-[15px] font-medium text-[#3d4a43] md:flex">
        <Link href="/#how-it-works" className="hover:text-[#111]">
          서비스 소개
        </Link>
        <Link href="/#pricing" className="hover:text-[#111]">
          요금제
        </Link>
        <Link href="/support" className="hover:text-[#111]">
          고객지원
        </Link>
      </nav>
      <div className="flex items-center gap-2">
        <LandingMobileNav />
        <Button
          variant="ghost"
          size="sm"
          className="hidden h-9 w-auto px-3 text-sm text-[#3d4a43] sm:inline-flex"
          nativeButton={false}
          render={<Link href="/login">로그인</Link>}
        />
        <KakaoSignInButton
          label="무료로 시작하기 →"
          size="sm"
          className="h-9 w-auto rounded-lg px-4 text-sm shadow-md shadow-primary/20"
        />
      </div>
    </header>
  );
}
