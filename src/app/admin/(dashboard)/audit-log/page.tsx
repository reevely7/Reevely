import Link from "next/link";

import { getAdminAuditLog } from "@/lib/db/queries/admin-audit-log";
import { createAdminClient } from "@/lib/supabase/admin";

const LOG_LIMIT = 100;
const FETCH_LIMIT = 1000;

const ACTION_LABELS: Record<string, string> = {
  suspend_user: "계정 정지",
  unsuspend_user: "정지 해제",
  disconnect_channel: "채널 연동 해제(대행)",
  delete_account: "계정 완전 삭제",
  change_plan: "플랜 변경",
  grant_promotional_plan: "프로모션 플랜 부여",
};

function formatDateTime(value: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${value.getFullYear()}.${pad(value.getMonth() + 1)}.${pad(value.getDate())} ${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`;
}

export default async function AdminAuditLogPage() {
  const [log, { data: usersData, error: usersError }] = await Promise.all([
    getAdminAuditLog(LOG_LIMIT),
    createAdminClient().auth.admin.listUsers({ page: 1, perPage: FETCH_LIMIT }),
  ]);

  const emailByUserId = new Map(
    (usersError ? [] : usersData.users).map((u) => [u.id, u.email || "-"]),
  );

  return (
    <main className="flex flex-1 flex-col gap-6 bg-background px-8 py-10 text-foreground">
      <header>
        <p className="text-xl font-semibold tracking-tight">감사 로그</p>
        <p className="text-xs text-muted-foreground">
          관리자가 유저 데이터를 조작한 액션 최근 {LOG_LIMIT}건입니다.
        </p>
      </header>

      <div className="overflow-x-auto rounded-2xl bg-card">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">시각</th>
              <th className="px-4 py-3 font-medium">관리자</th>
              <th className="px-4 py-3 font-medium">액션</th>
              <th className="px-4 py-3 font-medium">대상 유저</th>
              <th className="px-4 py-3 font-medium">상세</th>
            </tr>
          </thead>
          <tbody>
            {log.map((row) => (
              <tr key={row.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  {formatDateTime(row.createdAt)}
                </td>
                <td className="px-4 py-3">{row.adminUsername}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {ACTION_LABELS[row.action] ?? row.action}
                </td>
                <td className="px-4 py-3">
                  {row.targetUserId ? (
                    <Link
                      href={`/admin/users/${row.targetUserId}`}
                      className="text-primary hover:underline"
                    >
                      {emailByUserId.get(row.targetUserId) ?? row.targetUserId}
                    </Link>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  {row.details ? JSON.stringify(row.details) : "-"}
                </td>
              </tr>
            ))}
            {log.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  기록된 관리자 액션이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
