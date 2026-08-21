import { Users } from "lucide-react";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { MypageNav } from "@/components/mypage/mypage-nav";
import { Button } from "@/components/ui/button";
import {
  getAuthorSubscriptions,
  unsubscribeFromAuthor,
} from "@/lib/db/queries/notifications";
import { createClient } from "@/lib/supabase/server";

function formatDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
}

export default async function MyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const userId = user.id;
  const subscriptions = await getAuthorSubscriptions(userId);

  async function unsubscribeAction(formData: FormData) {
    "use server";
    const authorChannelId = String(formData.get("authorChannelId"));
    await unsubscribeFromAuthor(userId, authorChannelId);
    revalidatePath("/mypage");
  }

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8 sm:px-10">
      <header>
        <p className="text-xl font-semibold tracking-tight text-foreground">
          마이페이지
        </p>
        <p className="text-xs text-muted-foreground">
          새 댓글 알림을 받기로 구독한 작성자 목록입니다.
        </p>
      </header>

      <MypageNav />

      {subscriptions.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-card px-6 py-16 text-center">
          <Users className="size-8 text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">
            아직 구독 중인 작성자가 없습니다.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {subscriptions.map((sub) => (
            <div
              key={sub.authorChannelId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-card px-5 py-4"
            >
              <div className="min-w-0">
                <Link
                  href={`/authors/${encodeURIComponent(sub.authorChannelId)}`}
                  className="truncate text-sm font-medium text-card-foreground underline underline-offset-2"
                >
                  {sub.authorDisplayName ?? "알 수 없음"}
                </Link>
                <p className="mt-1 text-xs text-muted-foreground">
                  구독일 {formatDate(sub.createdAt)}
                </p>
              </div>
              <form action={unsubscribeAction}>
                <input
                  type="hidden"
                  name="authorChannelId"
                  value={sub.authorChannelId}
                />
                <Button type="submit" variant="outline">
                  구독 해제
                </Button>
              </form>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
