import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { MypageNav } from "@/components/mypage/mypage-nav";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function MypageProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const nickname = (user.user_metadata?.nickname as string | undefined) ?? "";

  async function updateNickname(formData: FormData) {
    "use server";
    const value = String(formData.get("nickname") ?? "").trim();
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
          설정하면 사이드바에 채널명 대신 표시됩니다.
        </p>
      </section>
    </main>
  );
}
