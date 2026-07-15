"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  // next-themes 공식 하이드레이션-안전 패턴: 마운트 전 서버/클라 값이 다를 수 있어
  // 마운트 후에만 실제 아이콘을 렌더한다 (eslint-disable: 파생 상태가 아니라
  // "브라우저에서 실행 중"이라는 외부 사실을 동기화하는 것이라 규칙 예외로 둠)
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="size-7" aria-hidden />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
      className="text-[#94B4C1] hover:bg-[#547792]/15 hover:text-[#ECEFCA]"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
