import Link from "next/link";

import { getCronRuns } from "@/lib/db/queries/cron-runs";
import { getAnalysisQuotaReachedUsersThisMonth } from "@/lib/db/queries/notifications";
import { getYoutubeApiUsageRecent } from "@/lib/db/queries/youtube-quota";
import { createAdminClient } from "@/lib/supabase/admin";

const CRON_NAMES = ["process-comments", "process-billing", "cleanup-expired-comments"];
const DAILY_QUOTA_LIMIT = 10000;
const FETCH_LIMIT = 1000;
const CRON_RUN_LIMIT = 30;

function formatDateTime(value: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${value.getFullYear()}.${pad(value.getMonth() + 1)}.${pad(value.getDate())} ${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`;
}

function formatDuration(startedAt: Date, finishedAt: Date | null): string {
  if (!finishedAt) return "미완료(예외로 중단됨)";
  return `${((finishedAt.getTime() - startedAt.getTime()) / 1000).toFixed(1)}초`;
}

export default async function AdminSystemPage({
  searchParams,
}: {
  searchParams: Promise<{ cron?: string }>;
}) {
  const { cron } = await searchParams;
  const activeCron = CRON_NAMES.includes(cron ?? "") ? cron : undefined;

  const [cronRuns, quotaUsage, quotaReachedUsers, { data: usersData, error: usersError }] =
    await Promise.all([
      getCronRuns(activeCron, CRON_RUN_LIMIT),
      getYoutubeApiUsageRecent(7),
      getAnalysisQuotaReachedUsersThisMonth(),
      createAdminClient().auth.admin.listUsers({ page: 1, perPage: FETCH_LIMIT }),
    ]);

  const emailByUserId = new Map(
    (usersError ? [] : usersData.users).map((u) => [u.id, u.email || "-"]),
  );

  const todayDateString = new Date().toISOString().slice(0, 10);
  const todayUsage = quotaUsage.find((q) => q.date === todayDateString)?.units ?? 0;
  const sortedQuotaUsage = [...quotaUsage].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <main className="flex flex-1 flex-col gap-6 bg-background px-8 py-10 text-foreground">
      <header>
        <p className="text-xl font-semibold tracking-tight">시스템/인프라 운영</p>
        <p className="text-xs text-muted-foreground">
          cron 실행 이력, YouTube API 쿼터, 월 분석량 한도 도달 현황입니다.
        </p>
      </header>

      <section className="space-y-3 rounded-2xl bg-card px-5 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-card-foreground">
            YouTube API 쿼터 (프로젝트 전체 공유)
          </h2>
          <p
            className={`text-sm font-semibold ${
              todayUsage >= DAILY_QUOTA_LIMIT * 0.8 ? "text-risk-high" : "text-foreground"
            }`}
          >
            오늘 {todayUsage.toLocaleString()} / {DAILY_QUOTA_LIMIT.toLocaleString()}
          </p>
        </div>
        <ul className="flex flex-wrap gap-4 text-sm">
          {sortedQuotaUsage.map((row) => (
            <li key={row.date} className="text-muted-foreground">
              <span className="font-mono text-xs">{row.date}</span>{" "}
              <span className="font-medium text-foreground">{row.units.toLocaleString()}</span>
            </li>
          ))}
          {sortedQuotaUsage.length === 0 && (
            <li className="text-muted-foreground">사용 이력이 없습니다.</li>
          )}
        </ul>
      </section>

      <section className="space-y-3 rounded-2xl bg-card px-5 py-4">
        <h2 className="text-sm font-medium text-card-foreground">
          이번 달 분석 한도 도달 유저 ({quotaReachedUsers.length}명)
        </h2>
        {quotaReachedUsers.length === 0 ? (
          <p className="text-sm text-muted-foreground">해당 없음</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {quotaReachedUsers.map((row) => (
              <li
                key={row.userId}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
              >
                <Link
                  href={`/admin/users/${row.userId}`}
                  className="text-primary hover:underline"
                >
                  {emailByUserId.get(row.userId) ?? row.userId}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(row.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3 rounded-2xl bg-card px-5 py-4">
        <h2 className="text-sm font-medium text-card-foreground">cron 실행 이력</h2>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/system"
            className={`rounded-full px-3 py-1.5 text-xs ${
              !activeCron
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            전체
          </Link>
          {CRON_NAMES.map((name) => (
            <Link
              key={name}
              href={`/admin/system?cron=${name}`}
              className={`rounded-full px-3 py-1.5 text-xs ${
                activeCron === name
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {name}
            </Link>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          {cronRuns.map((run) => (
            <details
              key={run.id}
              className="rounded-lg border border-border px-3 py-2 text-sm"
            >
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-foreground">{run.cronName}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(run.startedAt)} · {formatDuration(run.startedAt, run.finishedAt)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {run.itemCount.toLocaleString()}건
                  {run.errorCount > 0 && (
                    <span className="ml-1.5 rounded-full bg-risk-high-bg px-2 py-0.5 text-[11px] text-risk-high">
                      에러 {run.errorCount}건
                    </span>
                  )}
                  {run.fatalError && (
                    <span className="ml-1.5 rounded-full bg-risk-high-bg px-2 py-0.5 text-[11px] text-risk-high">
                      전체 실패
                    </span>
                  )}
                </span>
              </summary>
              <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-background p-3 text-xs text-muted-foreground">
                {run.fatalError ?? JSON.stringify(run.summary, null, 2)}
              </pre>
            </details>
          ))}
          {cronRuns.length === 0 && (
            <p className="text-sm text-muted-foreground">실행 이력이 없습니다.</p>
          )}
        </div>
      </section>
    </main>
  );
}
