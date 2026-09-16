"use client";

import { Menu, X } from "lucide-react";
import { useState } from "react";

export function LandingMobileNav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label={isOpen ? "메뉴 닫기" : "메뉴 열기"}
        aria-expanded={isOpen}
        className="text-foreground"
      >
        {isOpen ? (
          <X className="size-5" aria-hidden />
        ) : (
          <Menu className="size-5" aria-hidden />
        )}
      </button>

      {isOpen && (
        <div className="absolute inset-x-0 top-full z-40 flex flex-col gap-1 border-b border-border bg-background px-8 py-4 text-sm shadow-lg">
          <a
            href="#how-it-works"
            onClick={() => setIsOpen(false)}
            className="rounded-lg px-3 py-2 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            서비스 소개
          </a>
          <a
            href="#pricing"
            onClick={() => setIsOpen(false)}
            className="rounded-lg px-3 py-2 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            요금제
          </a>
          <a
            href="/login"
            onClick={() => setIsOpen(false)}
            className="rounded-lg px-3 py-2 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            로그인
          </a>
        </div>
      )}
    </div>
  );
}
