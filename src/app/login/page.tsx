import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { KakaoSignInButton } from "@/components/auth/kakao-sign-in-button";
import { KakaoIcon } from "@/components/icons/kakao-icon";
import { wordmarkFont } from "@/lib/fonts";
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
      <div className="w-full max-w-xl space-y-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          돌아가기
        </Link>

        <div className="space-y-10 rounded-3xl bg-card px-10 py-14 text-center sm:px-14 sm:py-16">
          <div className="space-y-3">
            <p className="text-sm">
              <span className={`${wordmarkFont.className} font-bold text-primary`}>
                Reevely
              </span>{" "}
              <span className="text-muted-foreground">시작하기</span>
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-card-foreground">
              카카오 계정으로 간편하게 시작하세요
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              기존 사용자라면 바로 로그인되고,
              <br />
              처음 이용하시는 경우 자동으로 회원가입이 진행됩니다.
            </p>
          </div>

          <div className="space-y-3">
            <KakaoSignInButton
              label="카카오로 시작하기"
              icon={<KakaoIcon className="size-5" />}
              className="h-14 w-full gap-2 bg-[#F4DC60] text-base font-semibold text-[#191600] hover:bg-[#EACB3F]"
            />
            <p className="text-xs text-muted-foreground">
              별도의 비밀번호 없이 안전하게 로그인할 수 있어요.
            </p>
          </div>

          <div className="border-t border-border pt-5">
            <p className="text-xs leading-relaxed text-muted-foreground">
              계속 진행하면{" "}
              <a href="/terms" target="_blank" className="underline">
                이용약관
              </a>{" "}
              및{" "}
              <a href="/privacy" target="_blank" className="underline">
                개인정보처리방침
              </a>
              에 동의하는 것으로 간주됩니다.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
