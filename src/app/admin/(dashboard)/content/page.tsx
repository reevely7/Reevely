import { Pagination } from "@/components/dashboard/pagination";
import { RiskBadge } from "@/components/dashboard/risk-badge";
import {
  countReportedFalseComments,
  getArchivedCommentCountsByUser,
  getReportedFalseComments,
} from "@/lib/db/queries/comments";
import {
  getAllSubscriptionsForAdmin,
  PLAN_EVIDENCE_ARCHIVE_LIMITS,
  FREE_EVIDENCE_ARCHIVE_LIMIT,
} from "@/lib/db/queries/subscriptions";
import { createAdminClient } from "@/lib/supabase/admin";

const PAGE_SIZE = 20;
const FETCH_LIMIT = 1000;
const ARCHIVE_USAGE_TOP_N = 20;

function formatDateTime(value: Date | null): string {
  if (!value) return "-";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${value.getFullYear()}.${pad(value.getMonth() + 1)}.${pad(value.getDate())} ${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

export default async function AdminContentPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const [
    totalReportedFalse,
    reportedFalseComments,
    archiveCounts,
    subscriptions,
    { data: usersData, error: usersError },
  ] = await Promise.all([
    countReportedFalseComments(),
    getReportedFalseComments(PAGE_SIZE, (page - 1) * PAGE_SIZE),
    getArchivedCommentCountsByUser(),
    getAllSubscriptionsForAdmin(),
    createAdminClient().auth.admin.listUsers({ page: 1, perPage: FETCH_LIMIT }),
  ]);

  const emailByUserId = new Map(
    (usersError ? [] : usersData.users).map((u) => [u.id, u.email || "-"]),
  );
  const planByUserId = new Map(subscriptions.map((s) => [s.userId, s.plan]));

  const archiveUsage = archiveCounts
    .map((row) => {
      const plan = planByUserId.get(row.userId);
      const limit = plan ? PLAN_EVIDENCE_ARCHIVE_LIMITS[plan] : FREE_EVIDENCE_ARCHIVE_LIMIT;
      const percent = limit === null || limit === 0 ? null : row.count / limit;
      return {
        userId: row.userId,
        count: row.count,
        limit,
        percent,
        email: emailByUserId.get(row.userId) ?? row.userId,
      };
    })
    .sort((a, b) => (b.percent ?? -1) - (a.percent ?? -1))
    .slice(0, ARCHIVE_USAGE_TOP_N);

  const totalPages = Math.max(1, Math.ceil(totalReportedFalse / PAGE_SIZE));

  return (
    <main className="flex flex-1 flex-col gap-6 bg-background px-8 py-10 text-foreground">
      <header>
        <p className="text-xl font-semibold tracking-tight">콘텐츠/신고 관리</p>
        <p className="text-xs text-muted-foreground">
          채널 구분 없이 시스템 전체 기준입니다.
        </p>
      </header>

      <section className="space-y-3 rounded-2xl bg-card px-5 py-4">
        <h2 className="text-sm font-medium text-card-foreground">
          증거 보관함 사용량 (상위 {ARCHIVE_USAGE_TOP_N}명, 한도 근접 순)
        </h2>
        {archiveUsage.length === 0 ? (
          <p className="text-sm text-muted-foreground">보관된 증거가 없습니다.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {archiveUsage.map((row) => (
              <li
                key={row.userId}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
              >
                <span className="truncate text-muted-foreground">{row.email}</span>
                <span
                  className={
                    row.percent !== null && row.percent >= 0.9
                      ? "font-mono text-xs text-risk-high"
                      : "font-mono text-xs text-muted-foreground"
                  }
                >
                  {row.count.toLocaleString()} / {row.limit === null ? "무제한" : row.limit.toLocaleString()}
                  {row.percent !== null && ` (${(row.percent * 100).toFixed(0)}%)`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3 rounded-2xl bg-card px-5 py-4">
        <h2 className="text-sm font-medium text-card-foreground">
          오탐 신고 검토 큐 (전체 {totalReportedFalse.toLocaleString()}건)
        </h2>
        {reportedFalseComments.length === 0 ? (
          <p className="text-sm text-muted-foreground">오탐 신고된 댓글이 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {reportedFalseComments.map((comment) => (
              <div key={comment.id} className="space-y-1.5 rounded-lg border border-border px-3 py-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  {comment.riskLevel && <RiskBadge riskLevel={comment.riskLevel} />}
                  <span className="text-xs text-muted-foreground">{comment.category}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    confidence {comment.confidence}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {comment.aiModel}/{comment.promptVersion}
                  </span>
                </div>
                <p className="text-sm text-card-foreground">{comment.text}</p>
                <p className="text-xs text-muted-foreground">
                  {emailByUserId.get(comment.userId) ?? comment.userId} ·{" "}
                  {comment.videoTitle ?? comment.videoId} · 판정 {formatDateTime(comment.analyzedAt)}
                </p>
              </div>
            ))}
          </div>
        )}
        {totalPages > 1 && <Pagination currentPage={page} totalPages={totalPages} />}
      </section>
    </main>
  );
}
