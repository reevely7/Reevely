import Link from "next/link";

import { Pagination } from "@/components/dashboard/pagination";
import { getAllChannels } from "@/lib/db/queries/channels";
import { createAdminClient } from "@/lib/supabase/admin";

const PAGE_SIZE = 20;
const FETCH_LIMIT = 1000; // /admin/users와 동일한 근사치 — 지금 규모에선 충분

type StatusFilter = "all" | "active" | "locked" | "reauth";

const TABS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "active", label: "정상" },
  { value: "locked", label: "잠김" },
  { value: "reauth", label: "재연동 필요" },
];

function formatDateTime(value: Date | null): string {
  if (!value) return "-";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${value.getFullYear()}.${pad(value.getMonth() + 1)}.${pad(value.getDate())} ${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

export default async function AdminChannelsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { status, page: pageParam } = await searchParams;
  const activeTab: StatusFilter = TABS.some((t) => t.value === status)
    ? (status as StatusFilter)
    : "all";
  const page = Math.max(1, Number(pageParam) || 1);

  const [channels, { data: usersData, error: usersError }] = await Promise.all([
    getAllChannels(),
    createAdminClient().auth.admin.listUsers({ page: 1, perPage: FETCH_LIMIT }),
  ]);
  const emailByUserId = new Map(
    (usersError ? [] : usersData.users).map((u) => [u.id, u.email || "-"]),
  );

  const rows = channels
    .map((c) => ({
      id: c.id,
      channelTitle: c.channelTitle,
      ownerEmail: emailByUserId.get(c.userId) ?? "-",
      status: c.status,
      reauthRequiredAt: c.reauthRequiredAt,
      lastSyncedAt: c.lastSyncedAt,
      createdAt: c.createdAt,
    }))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const counts = {
    all: rows.length,
    active: rows.filter((r) => r.status === "active" && !r.reauthRequiredAt).length,
    locked: rows.filter((r) => r.status === "locked").length,
    reauth: rows.filter((r) => Boolean(r.reauthRequiredAt)).length,
  };

  const filtered = rows.filter((r) => {
    if (activeTab === "active") return r.status === "active" && !r.reauthRequiredAt;
    if (activeTab === "locked") return r.status === "locked";
    if (activeTab === "reauth") return Boolean(r.reauthRequiredAt);
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <main className="flex flex-1 flex-col gap-6 bg-background px-8 py-10 text-foreground">
      <header>
        <p className="text-xl font-semibold tracking-tight">채널 연동 관리</p>
        <p className="text-xs text-muted-foreground">
          전체 연동 채널 {rows.length}개
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Link
            key={tab.value}
            href={tab.value === "all" ? "/admin/channels" : `/admin/channels?status=${tab.value}`}
            className={`rounded-full px-3 py-1.5 text-xs ${
              activeTab === tab.value
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label} ({counts[tab.value]})
          </Link>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl bg-card">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">채널명</th>
              <th className="px-4 py-3 font-medium">소유자</th>
              <th className="px-4 py-3 font-medium">상태</th>
              <th className="px-4 py-3 font-medium">마지막 sync</th>
              <th className="px-4 py-3 font-medium">연동일</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-border last:border-0 hover:bg-muted/40"
              >
                <td className="px-4 py-3">{row.channelTitle}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.ownerEmail}</td>
                <td className="px-4 py-3">
                  <span className="flex flex-wrap gap-1.5">
                    {row.status === "locked" && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                        잠김
                      </span>
                    )}
                    {row.reauthRequiredAt && (
                      <span className="rounded-full bg-risk-high-bg px-2 py-0.5 text-[11px] text-risk-high">
                        재연동 필요
                      </span>
                    )}
                    {row.status === "active" && !row.reauthRequiredAt && (
                      <span className="text-xs text-muted-foreground">정상</span>
                    )}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  {formatDateTime(row.lastSyncedAt)}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  {formatDateTime(row.createdAt)}
                </td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  조건에 맞는 채널이 없습니다.
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
