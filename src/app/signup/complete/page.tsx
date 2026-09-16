import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/auth/logout-button";
import { Button } from "@/components/ui/button";
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
      <div className="w-full max-w-sm space-y-6 rounded-2xl bg-card px-6 py-8">
        <header className="space-y-1 text-center">
          <h1 className="text-xl font-semibold tracking-tight text-card-foreground">
            회원가입
          </h1>
          <p className="text-xs text-muted-foreground">
            서비스 이용을 위해 몇 가지 정보가 필요해요.
          </p>
        </header>

        {errorMessage ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {errorMessage}
          </p>
        ) : null}

        <form action={completeSignup} className="space-y-5">
          <div className="space-y-2">
            <label
              htmlFor="nickname"
              className="text-sm font-medium text-card-foreground"
            >
              닉네임
            </label>
            <input
              id="nickname"
              type="text"
              name="nickname"
              placeholder="닉네임을 입력하세요"
              maxLength={30}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="space-y-3">
            <label className="flex items-start gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                name="agreeTerms"
                className="mt-0.5 size-4 shrink-0"
              />
              <span>
                (필수){" "}
                <a href="/terms" target="_blank" className="underline">
                  이용약관
                </a>{" "}
                및{" "}
                <a href="/privacy" target="_blank" className="underline">
                  개인정보처리방침
                </a>
                에 동의합니다.
              </span>
            </label>

            <label className="flex items-start gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                name="agreeAge"
                className="mt-0.5 size-4 shrink-0"
              />
              <span>(필수) 만 14세 이상입니다.</span>
            </label>

            <label className="flex items-start gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                name="agreeMarketing"
                className="mt-0.5 size-4 shrink-0"
              />
              <span>(선택) 마케팅 정보 수신에 동의합니다.</span>
            </label>
          </div>

          <Button type="submit" className="w-full">
            가입 완료
          </Button>
        </form>

        <LogoutButton />
      </div>
    </main>
  );
}
