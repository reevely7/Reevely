import Link from "next/link";

import { CommentSearch } from "@/components/dashboard/comment-search";
import { Pagination } from "@/components/dashboard/pagination";
import { getChannelsByUserId } from "@/lib/db/queries/channels";
import { getSubscriptionByUserId, PLAN_LABELS } from "@/lib/db/queries/subscriptions";
import { getSuspendedUserIdsIn } from "@/lib/db/queries/suspended-users";
import { createAdminClient } from "@/lib/supabase/admin";

const PAGE_SIZE = 20;
// Supabase listUsers 1회 호출 상한 근사치 — 지금 규모에선 전체를 한 번에
// 가져와 메모리에서 검색/페이지네이션한다. 유저가 훨씬 많아지면 서버 사이드
// 검색으로 바꿔야 한다.
const FETCH_LIMIT = 1000;

function formatDate(value: string): string {
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: FETCH_LIMIT,
  });
  const allUsers = error ? [] : data.users;

  const query = q?.trim().toLowerCase();
  const filtered = query
    ? allUsers.filter((u) => {
        const nickname = ((u.user_metadata?.nickname as string | undefined) ?? "").toLowerCase();
        return (u.email ?? "").toLowerCase().includes(query) || nickname.includes(query);
      })
    : allUsers;

  filtered.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageUsers = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const suspendedSet = await getSuspendedUserIdsIn(pageUsers.map((u) => u.id));
  const rows = await Promise.all(
    pageUsers.map(async (u) => {
      const [channels, subscription] = await Promise.all([
        getChannelsByUserId(u.id),
        getSubscriptionByUserId(u.id),
      ]);
      return {
        id: u.id,
        email: u.email || "-",
        nickname: (u.user_metadata?.nickname as string | undefined) ?? null,
        createdAt: u.created_at,
        channelCount: channels.length,
        plan: subscription ? PLAN_LABELS[subscription.plan] : "무료",
        suspended: suspendedSet.has(u.id),
      };
    }),
  );

  return (
    <main className="flex flex-1 flex-col gap-6 bg-background px-8 py-10 text-foreground">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xl font-semibold tracking-tight">유저 관리</p>
          <p className="text-xs text-muted-foreground">
            전체 {allUsers.length}명 · 검색 결과 {filtered.length}명
          </p>
        </div>
        <CommentSearch paramKey="q" placeholder="이메일/닉네임 검색" />
      </header>

      <div className="overflow-x-auto rounded-2xl bg-card">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">이메일</th>
              <th className="px-4 py-3 font-medium">닉네임</th>
              <th className="px-4 py-3 font-medium">플랜</th>
              <th className="px-4 py-3 font-medium">채널 수</th>
              <th className="px-4 py-3 font-medium">가입일</th>
              <th className="px-4 py-3 font-medium">상태</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-border last:border-0 hover:bg-muted/40"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/users/${row.id}`}
                    className="text-primary hover:underline"
                  >
                    {row.email}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{row.nickname ?? "-"}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.plan}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.channelCount}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  {formatDate(row.createdAt)}
                </td>
                <td className="px-4 py-3">
                  {row.suspended ? (
                    <span className="rounded-full bg-risk-high-bg px-2 py-0.5 text-[11px] text-risk-high">
                      정지됨
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">정상</span>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-sm text-muted-foreground"
                >
                  조건에 맞는 유저가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && <Pagination currentPage={page} totalPages={totalPages} />}
    </main>
  );
}
