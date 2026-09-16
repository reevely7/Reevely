import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { MypageNav } from "@/components/mypage/mypage-nav";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { NICKNAME_ERROR_MESSAGES, validateNickname } from "@/lib/validation/nickname";

export default async function MypageProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const nickname = (user.user_metadata?.nickname as string | undefined) ?? "";

  const { error } = await searchParams;
  const errorMessage =
    error && error in NICKNAME_ERROR_MESSAGES
      ? NICKNAME_ERROR_MESSAGES[error as keyof typeof NICKNAME_ERROR_MESSAGES]
      : null;

  async function updateNickname(formData: FormData) {
    "use server";
    const value = String(formData.get("nickname") ?? "").trim();

    const nicknameError = validateNickname(value);
    if (nicknameError) {
      redirect(`/mypage/profile?error=${nicknameError}`);
    }

    const supabase = await createClient();
    await supabase.auth.updateUser({ data: { nickname: value } });
    revalidatePath("/mypage/profile");
    revalidatePath("/", "layout");
  }

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8 sm:px-10">
      <header>
        <p className="text-xl font-semibold tracking-tight text-foreground">
          마이페이지
        </p>
        <p className="text-xs text-muted-foreground">
          앱 안에서 사용할 닉네임을 설정합니다.
        </p>
      </header>

      <MypageNav />

      <section className="max-w-sm space-y-3 rounded-2xl bg-card px-5 py-4">
        <h2 className="text-sm font-medium text-card-foreground">닉네임</h2>
        {errorMessage ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {errorMessage}
          </p>
        ) : null}
        <form action={updateNickname} className="flex items-center gap-2">
          <input
            type="text"
            name="nickname"
            defaultValue={nickname}
            placeholder="닉네임을 입력하세요"
            maxLength={30}
            className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground"
          />
          <Button type="submit">저장</Button>
        </form>
        <p className="text-xs text-muted-foreground">
          한글 최대 8자 또는 영문 최대 12자, 숫자만으로는 설정할 수 없어요.
        </p>
      </section>
    </main>
  );
}
