"use client";

import type { ReactNode } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type Props = {
  label?: string;
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg";
  icon?: ReactNode;
};

export function KakaoSignInButton({
  label = "카카오로 계속하기",
  className,
  variant = "default",
  size = "lg",
  icon,
}: Props) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignIn() {
    setIsLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          prompt: "login",
        },
      },
    });
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className ?? "w-full"}
      onClick={handleSignIn}
      disabled={isLoading}
    >
      {!isLoading && icon}
      {isLoading ? "이동하는 중…" : label}
    </Button>
  );
}
