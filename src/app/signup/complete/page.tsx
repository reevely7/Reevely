import { ChevronRight } from "lucide-react";
import { redirect } from "next/navigation";

import { NicknameField } from "@/components/auth/nickname-field";
import { SignupAgreements } from "@/components/auth/signup-agreements";
import { SwitchToLoginLink } from "@/components/auth/switch-to-login-link";
import { Button } from "@/components/ui/button";
import { KakaoIcon } from "@/components/icons/kakao-icon";
import { isSignupCompleted } from "@/lib/auth/signup-status";
import { createClient } from "@/lib/supabase/server";
import { NICKNAME_ERROR_MESSAGES, validateNickname } from "@/lib/validation/nickname";

const ERROR_MESSAGES: Record<string, string> = {
  ...NICKNAME_ERROR_MESSAGES,
  terms: "이용약관 및 개인정보처리방침에 동의해주세요.",
  age: "만 14세 이상만 가입할 수 있습니다.",
};

async function completeSignup(formData: FormData) {
  "use server";

  const nickname = String(formData.get("nickname") ?? "").trim();
  const agreeTerms = formData.get("agreeTerms") === "on";
  const agreeAge = formData.get("agreeAge") === "on";
  const agreeMarketing = formData.get("agreeMarketing") === "on";

  const nicknameError = validateNickname(nickname);
  if (nicknameError) {
    redirect(`/signup/complete?error=${nicknameError}`);
  }
  if (!agreeTerms) {
    redirect("/signup/complete?error=terms");
  }
  if (!agreeAge) {
    redirect("/signup/complete?error=age");
  }

  const supabase = await createClient();
  const now = new Date().toISOString();
  await supabase.auth.updateUser({
    data: {
      nickname,
      terms_agreed_at: now,
      age_confirmed: true,
      marketing_opt_in: agreeMarketing,
      signup_completed_at: now,
    },
  });

  redirect("/onboarding");
}

export default async function SignupCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (isSignupCompleted(user)) {
    redirect("/onboarding");
  }

  const { error } = await searchParams;
  const errorMessage = error ? ERROR_MESSAGES[error] : null;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-12">
      <div className="w-full max-w-lg space-y-7 rounded-3xl bg-card px-8 py-10">
        <header className="space-y-1 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-card-foreground">
            회원가입
          </h1>
          <p className="text-xs text-muted-foreground">
            서비스 이용을 위해 몇 가지 정보를 입력해주세요.
          </p>
        </header>

        {errorMessage ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {errorMessage}
          </p>
        ) : null}

        <div className="flex items-center gap-3 rounded-xl bg-[#ECF2EC] px-3.5 py-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white">
            <KakaoIcon className="size-5 text-[#191600]" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-card-foreground">
              카카오 계정 인증 완료
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              카카오 계정으로 안전하게 인증이 완료되었습니다.
            </span>
          </span>
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>
        </div>

        <form action={completeSignup} className="space-y-5">
          <NicknameField />

          <SignupAgreements />

          <Button type="submit" className="h-14 w-full gap-1 text-base">
            가입 완료
            <ChevronRight className="size-4" aria-hidden />
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          이미 계정이 있으신가요?{" "}
          <SwitchToLoginLink className="font-medium text-foreground underline" />
        </p>
      </div>
    </main>
  );
}
