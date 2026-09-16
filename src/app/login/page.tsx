import { redirect } from "next/navigation";

import { KakaoSignInButton } from "@/components/auth/kakao-sign-in-button";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-12">
      <div className="w-full max-w-sm space-y-6 rounded-2xl bg-card px-6 py-8 text-center">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-card-foreground">
            로그인
          </h1>
          <p className="text-xs text-muted-foreground">
            카카오 계정으로 로그인하세요.
          </p>
        </header>

        <KakaoSignInButton label="카카오톡으로 로그인하기" className="w-full" />

        <p className="text-xs text-muted-foreground">
          신규 사용자이신가요?{" "}
          <a href="/signup" className="font-medium text-foreground underline">
            가입하기
          </a>
        </p>
      </div>
    </main>
  );
}
