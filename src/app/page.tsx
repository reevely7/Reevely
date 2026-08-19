import { redirect } from "next/navigation";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { getChannelByUserId } from "@/lib/db/queries/channels";
import { createClient } from "@/lib/supabase/server";

const ERROR_MESSAGES: Record<string, string> = {
  auth: "로그인 처리 중 문제가 발생했습니다. 다시 시도해 주세요.",
  no_provider_token: "구글로부터 접근 권한을 받지 못했습니다. 다시 시도해 주세요.",
  channel_connect: "유튜브 채널 연동에 실패했습니다. 채널이 있는 계정으로 다시 로그인해 주세요.",
};

const STEPS = [
  {
    title: "채널을 연동해요",
    body: "유튜브 채널을 OAuth로 직접 연동합니다. 스크래핑이 아닌 YouTube Data API 공식 연동이라 계정 정보는 저희를 거치지 않아요.",
  },
  {
    title: "댓글을 조용히 지켜봐요",
    body: "새 영상이 올라오면 1시간마다, 없으면 6시간마다 댓글을 확인합니다. 실시간은 아니지만, 계속 지켜보고 있어요.",
  },
  {
    title: "AI가 위험도를 판정해요",
    body: "댓글 하나하나를 분석해 위험도와 유형, 판정 근거를 함께 남깁니다.",
  },
  {
    title: "대시보드에서 확인해요",
    body: "위험도별로 정리된 화면에서 훑어보고, 아니다 싶으면 오탐 신고 한 번으로 끝.",
  },
];

export default async function LandingPage({
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
    <main className="flex flex-1 flex-col">
      {/* 상단 내비게이션 */}
      <header className="flex items-center justify-between px-8 py-5 sm:px-12">
        <p className="text-lg font-semibold tracking-tight text-foreground">
          Reevely
        </p>
        <div className="flex items-center gap-2">
          <GoogleSignInButton
            label="로그인"
            variant="ghost"
            size="sm"
            className="w-auto"
          />
          <GoogleSignInButton
            label="회원가입"
            variant="outline"
            size="sm"
            className="w-auto"
          />
        </div>
      </header>

      {/* 히어로 */}
      <section className="relative overflow-hidden bg-background px-8 py-16 text-foreground sm:px-12 md:py-24">
        <div
          aria-hidden
          className="animate-scan-sweep pointer-events-none absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
        />

        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
          <h1 className="text-4xl leading-snug font-semibold tracking-tight sm:text-5xl">
            악플이 아니라,
            <br />
            기록을 남깁니다.
          </h1>
          <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
            소속사도 법무팀도 없는 채널이 대부분입니다. 당신 채널의 댓글을
            대신 지켜보고, AI로 위험도를 판정해 필요한 순간 증거로
            남겨둡니다.
          </p>
          {errorMessage && (
            <p className="rounded-md bg-risk-high-bg px-3 py-2 text-xs text-risk-high">
              {errorMessage}
            </p>
          )}
          <GoogleSignInButton
            label="시작하기"
            className="h-12 w-auto px-10 text-base"
          />
          <p className="text-xs text-muted-foreground">
            유튜브 채널 읽기 권한만 요청합니다.
          </p>
        </div>
      </section>

      {/* 왜 필요한가 */}
      <section className="border-b border-border bg-background px-8 py-16 sm:px-12">
        <div className="mx-auto max-w-2xl space-y-3 text-center">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            구독자가 늘수록, 댓글창은 혼자 감당하기 버거워집니다
          </h2>
          <p className="text-sm text-muted-foreground">
            구독자 1만~50만, 소속사나 법무팀 없이 채널을 운영하는
            크리에이터를 위해 만들었습니다. 매번 댓글창을 직접 훑어보지
            않아도, 위험한 댓글은 자동으로 걸러서 보여드려요.
          </p>
        </div>
      </section>

      {/* 동작 원리 */}
      <section className="bg-background px-8 py-16 sm:px-12">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-8 text-center text-xl font-semibold tracking-tight text-foreground">
            이렇게 동작해요
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <div
                key={step.title}
                className="rounded-2xl bg-card px-5 py-5 text-left"
              >
                <p className="mb-2 font-mono text-xs text-primary">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <p className="mb-1.5 text-sm font-semibold text-card-foreground">
                  {step.title}
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 오탐 관리 원칙 */}
      <section className="border-y border-border bg-background px-8 py-16 sm:px-12">
        <div className="mx-auto max-w-2xl rounded-2xl bg-card px-8 py-10 text-center">
          <p className="mb-2 text-xs font-medium tracking-wide text-primary uppercase">
            오탐 관리 원칙
          </p>
          <h2 className="mb-3 text-xl font-semibold tracking-tight text-card-foreground">
            확신 없는 판정은, 확정하지 않습니다
          </h2>
          <p className="text-sm text-muted-foreground">
            AI가 확신하지 못한 댓글(confidence 0.7 미만)은 자동으로 확정하지
            않고 별도의 검토 큐로 분리합니다. 잘못된 확정보다, 사람이 한 번
            더 확인하는 쪽을 택했습니다.
          </p>
        </div>
      </section>

      {/* 마무리 CTA */}
      <section className="bg-background px-8 py-16 text-center text-foreground sm:px-12">
        <div className="mx-auto flex max-w-xl flex-col items-center gap-5">
          <h2 className="text-2xl font-semibold tracking-tight">
            지금 채널을 연동해 보세요
          </h2>
          <p className="text-sm text-muted-foreground">
            유튜브 채널 읽기 권한만 요청합니다.
          </p>
          <GoogleSignInButton
            label="시작하기"
            className="h-12 w-auto px-10 text-base"
          />
        </div>
      </section>
    </main>
  );
}
