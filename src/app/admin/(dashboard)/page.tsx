import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { clearAdminSessionCookie } from "@/lib/auth/admin-session";

export default function AdminDashboardPage() {
  async function logout() {
    "use server";
    await clearAdminSessionCookie();
    redirect("/admin/login");
  }

  return (
    <main className="flex min-h-dvh flex-1 flex-col gap-6 bg-background px-8 py-10 text-foreground">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xl font-semibold tracking-tight">관리자 페이지</p>
          <p className="text-xs text-muted-foreground">
            로그인 동작 확인용 placeholder 화면입니다. 실제 관리 기능은 아직
            없습니다.
          </p>
        </div>
        <form action={logout}>
          <Button type="submit" variant="outline" size="sm">
            로그아웃
          </Button>
        </form>
      </header>
    </main>
  );
}
