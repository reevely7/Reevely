import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { setAdminSessionCookie } from "@/lib/auth/admin-session";
import { verifyPassword } from "@/lib/crypto/password";
import { getAdminUserByUsername } from "@/lib/db/queries/admin-users";

const ERROR_MESSAGES: Record<string, string> = {
  invalid: "아이디 또는 비밀번호가 올바르지 않습니다.",
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const errorMessage = error ? ERROR_MESSAGES[error] : undefined;

  async function loginAdmin(formData: FormData) {
    "use server";
    const username = String(formData.get("username") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    const admin = username ? await getAdminUserByUsername(username) : null;
    if (!admin || !verifyPassword(password, admin.passwordHash)) {
      redirect("/admin/login?error=invalid");
    }

    await setAdminSessionCookie(admin.id);
    redirect("/admin");
  }

  return (
    <main className="flex min-h-dvh flex-1 items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <p className="text-lg font-semibold tracking-tight text-foreground">
            Reevely
          </p>
          <p className="text-sm text-muted-foreground">관리자 페이지</p>
        </div>

        <form action={loginAdmin} className="space-y-3 rounded-2xl bg-card px-6 py-6">
          {errorMessage && (
            <p className="rounded-md bg-risk-high-bg px-3 py-2 text-xs text-risk-high">
              {errorMessage}
            </p>
          )}

          <div className="space-y-1.5">
            <label htmlFor="username" className="text-xs text-muted-foreground">
              아이디
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              autoComplete="username"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-xs text-muted-foreground">
              비밀번호
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>

          <Button type="submit" className="w-full">
            로그인
          </Button>
        </form>
      </div>
    </main>
  );
}
