import { redirect } from "next/navigation";

import { KakaoSignInButton } from "@/components/auth/kakao-sign-in-button";
import { LandingMobileNav } from "@/components/landing/landing-mobile-nav";
import { SiteFooter } from "@/components/landing/site-footer";
import { Button } from "@/components/ui/button";
import { PricingTable } from "@/components/landing/pricing-table";
import { getChannelsByUserId } from "@/lib/db/queries/channels";
import { createClient } from "@/lib/supabase/server";

const ERROR_MESSAGES: Record<string, string> = {
  auth: "로그인 처리 중 문제가 발생했습니다. 다시 시도해 주세요.",
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
    const channels = await getChannelsByUserId(user.id);
    redirect(channels.length > 0 ? `/c/${channels[0].id}/dashboard` : "/onboarding");
  }

  return (
    <main className="flex flex-1 flex-col">
      {/* 상단 내비게이션 */}
      <header className="relative flex items-center justify-between px-8 py-5 sm:px-12">
        <p className="text-lg font-semibold tracking-tight text-foreground">
          reevely
        </p>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <a href="#intro" className="hover:text-foreground">
            서비스소개
          </a>
          <a href="#pricing" className="hover:text-foreground">
            요금제
          </a>
          <span
            title="준비 중입니다"
            className="cursor-default text-muted-foreground/50"
          >
            고객사례
          </span>
          <span
            title="준비 중입니다"
            className="cursor-default text-muted-foreground/50"
          >
            리소스
          </span>
        </nav>
        <div className="flex items-center gap-2">
          <LandingMobileNav />
          <Button
            variant="ghost"
            size="sm"
            className="w-auto"
            nativeButton={false}
            render={<a href="/admin/login">관리자 페이지</a>}
          />
          <Button
            variant="ghost"
            size="sm"
            className="w-auto"
            nativeButton={false}
            render={<a href="/login">로그인</a>}
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
            좋은 크리에이터의 내일을 지킵니다
          </h1>
          <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
            AI가 댓글을 먼저 읽고 위험도를 판단합니다. 크리에이터는 필요한
            댓글만 확인하세요.
          </p>
          {errorMessage && (
            <p className="rounded-md bg-risk-high-bg px-3 py-2 text-xs text-risk-high">
              {errorMessage}
            </p>
          )}
          <KakaoSignInButton
            label="무료로 시작하기"
            className="h-12 w-auto px-10 text-base"
          />
          <p className="text-xs text-muted-foreground">
            카카오 로그인 후 유튜브 채널을 연동합니다.
          </p>
        </div>
      </section>

      {/* 왜 필요한가 */}
      <section id="intro" className="border-b border-border bg-background px-8 py-16 sm:px-12">
        <div className="mx-auto max-w-2xl space-y-3 text-center">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            구독자가 늘수록, 댓글창은 혼자 감당하기 버거워집니다
          </h2>
          <p className="text-sm text-muted-foreground">
            혼자 댓글을 관리하는 크리에이터를 위해 만들었습니다. 매번
            댓글창을 직접 훑어보지 않아도, 위험한 댓글은 자동으로 걸러서
            보여드려요.
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
            AI가 확신하지 못한 댓글(신뢰도 70% 미만)은 자동으로 확정하지
            않고 별도의 검토 큐로 분리합니다. 잘못된 확정보다, 사람이 한 번
            더 확인하는 쪽을 택했습니다.
          </p>
        </div>
      </section>

      {/* 요금제 */}
      <section id="pricing" className="border-b border-border bg-background px-8 py-16 sm:px-12">
        <div className="mx-auto max-w-6xl">
          <PricingTable />

          <div className="mt-8 flex flex-col items-center gap-3 text-center">
            <KakaoSignInButton
              label="내 채널 보호하기"
              className="h-12 w-auto px-10 text-base"
            />
            <p className="text-xs text-muted-foreground">
              지금 가입하면 정식 출시 시 가장 먼저 안내드립니다.
            </p>
          </div>
        </div>
      </section>

      {/* 마무리 CTA */}
      <section className="bg-background px-8 py-16 text-center text-foreground sm:px-12">
        <div className="mx-auto flex max-w-xl flex-col items-center gap-5">
          <h2 className="text-2xl font-semibold tracking-tight">
            지금 채널을 연동해 보세요
          </h2>
          <p className="text-sm text-muted-foreground">
            카카오 로그인 후 유튜브 채널을 연동합니다.
          </p>
          <KakaoSignInButton
            label="내 채널 보호하기"
            className="h-12 w-auto px-10 text-base"
          />
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
