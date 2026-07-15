import { redirect } from "next/navigation";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { getChannelByUserId } from "@/lib/db/queries/channels";
import { createClient } from "@/lib/supabase/server";

const ERROR_MESSAGES: Record<string, string> = {
  auth: "로그인 처리 중 문제가 발생했습니다. 다시 시도해 주세요.",
  no_provider_token: "구글로부터 접근 권한을 받지 못했습니다. 다시 시도해 주세요.",
  channel_connect: "유튜브 채널 연동에 실패했습니다. 채널이 있는 계정으로 다시 로그인해 주세요.",
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const errorMessage = error ? ERROR_MESSAGES[error] : undefined;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const channel = await getChannelByUserId(user.id);
    redirect(channel ? "/dashboard" : "/onboarding");
  }

  return (
    <main className="flex flex-1 flex-col md:flex-row">
      {/* 왼쪽: 브랜드 패널 — 항상 다크 네이비(팔레트 반전), 다크모드 토글과 무관하게 고정 */}
      <section className="relative flex flex-1 flex-col overflow-hidden bg-[#213448] px-8 py-12 text-[#ECEFCA] sm:px-12 md:py-16">
        <div
          aria-hidden
          className="animate-scan-sweep pointer-events-none absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-[#547792] to-transparent"
        />

        <p className="font-heading text-2xl italic tracking-tight">
          Reevely
        </p>

        <div className="flex flex-1 items-center">
          <div className="max-w-sm space-y-3">
            <h1 className="font-heading text-3xl leading-snug sm:text-4xl">
              악플이 아니라,
              <br />
              기록을 남깁니다.
            </h1>
            <p className="text-sm text-[#94B4C1]">
              당신 채널의 댓글을 조용히 지켜보고, 필요한 순간 증거로
              남겨둡니다.
            </p>
          </div>
        </div>
      </section>

      {/* 오른쪽: 크림 배경 — 실제 로그인 동작 */}
      <section className="flex flex-1 flex-col items-center justify-center gap-6 bg-background px-8 py-16 sm:px-12">
        <div className="w-full max-w-xs space-y-6 text-center">
          <h2 className="font-heading text-2xl text-foreground">시작하기</h2>
          {errorMessage && (
            <p className="rounded-md bg-risk-high-bg px-3 py-2 text-xs text-risk-high">
              {errorMessage}
            </p>
          )}
          <GoogleSignInButton />
          <p className="text-xs text-muted-foreground">
            유튜브 채널 읽기 권한만 요청합니다.
          </p>
        </div>
      </section>
    </main>
  );
}
