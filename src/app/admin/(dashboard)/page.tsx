import Link from "next/link";
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
            아직 유저 관리 기능만 있습니다. 나머지 항목은 순차적으로 추가될
            예정입니다.
          </p>
        </div>
        <form action={logout}>
          <Button type="submit" variant="outline" size="sm">
            로그아웃
          </Button>
        </form>
      </header>

      <nav className="flex flex-col gap-2 rounded-2xl bg-card px-5 py-4">
        <Link
          href="/admin/users"
          className="text-sm font-medium text-primary hover:underline"
        >
          유저 관리
        </Link>
        <Link
          href="/admin/channels"
          className="text-sm font-medium text-primary hover:underline"
        >
          채널 연동 관리
        </Link>
      </nav>
    </main>
  );
}
