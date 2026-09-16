"use client";

import { Menu, X } from "lucide-react";
import { useState } from "react";

// 딥그린 히어로 블록 안에 놓이므로 트리거는 흰색, 펼침 패널은
// 히어로와 같은 딥그린 톤으로 맞춘다.
export function LandingMobileNav() {
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
          <a
            href="#how-it-works"
            onClick={() => setIsOpen(false)}
            className="rounded-2xl px-4 py-3 font-semibold text-white/80 hover:bg-white/10 hover:text-white"
          >
            서비스 소개
          </a>
          <a
            href="#pricing"
            onClick={() => setIsOpen(false)}
            className="rounded-2xl px-4 py-3 font-semibold text-white/80 hover:bg-white/10 hover:text-white"
          >
            요금제
          </a>
          <a
            href="/login"
            onClick={() => setIsOpen(false)}
            className="rounded-2xl px-4 py-3 font-semibold text-white/80 hover:bg-white/10 hover:text-white"
          >
            로그인
          </a>
        </div>
      )}
    </div>
  );
}
