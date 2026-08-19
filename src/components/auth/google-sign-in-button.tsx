"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function GoogleSignInButton() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignIn() {
    setIsLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        // 유튜브 댓글을 서버에서 대신 가져오려면 refresh_token이 필요함.
        // commentThreads.list는 youtube.readonly로는 403(insufficientPermissions)이
        // 나고 youtube.force-ssl scope가 있어야 동작한다.
        scopes: "https://www.googleapis.com/auth/youtube.force-ssl",
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
  }

  return (
    <Button
      size="lg"
      className="w-full"
      onClick={handleSignIn}
      disabled={isLoading}
    >
      {isLoading ? "이동하는 중…" : "Google 계정으로 계속하기"}
    </Button>
  );
}
