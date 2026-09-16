"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

// 회사소개·제휴제안·고객센터 등 서브페이지 헤더의 모바일 메뉴.
// 랜딩의 LandingMobileNav와 톤은 같지만, 서브페이지에서는 앵커가 아니라
// 홈의 섹션(/#how-it-works 등)으로 링크해야 한다.
export function MarketingMobileNav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label={isOpen ? "메뉴 닫기" : "메뉴 열기"}
        aria-expanded={isOpen}
        className="flex size-10 items-center justify-center rounded-full border border-white/25 text-white"
      >
        {isOpen ? (
          <X className="size-5" aria-hidden />
        ) : (
          <Menu className="size-5" aria-hidden />
        )}
      </button>

      {isOpen && (
        <div className="absolute inset-x-4 top-full z-40 flex flex-col gap-1 rounded-3xl border border-white/10 bg-[var(--landing-forest-deep)] p-3 text-sm shadow-2xl">
          <Link
            href="/#how-it-works"
            onClick={() => setIsOpen(false)}
            className="rounded-2xl px-4 py-3 font-semibold text-white/80 hover:bg-white/10 hover:text-white"
          >
            서비스 소개
          </Link>
          <Link
            href="/#pricing"
            onClick={() => setIsOpen(false)}
            className="rounded-2xl px-4 py-3 font-semibold text-white/80 hover:bg-white/10 hover:text-white"
          >
            요금제
          </Link>
          <Link
            href="/login"
            onClick={() => setIsOpen(false)}
            className="rounded-2xl px-4 py-3 font-semibold text-white/80 hover:bg-white/10 hover:text-white"
          >
            로그인
          </Link>
        </div>
      )}
    </div>
  );
}
