import {
  countAnalyzedCommentsInRange,
  countArchivedCommentsByChannelId,
  countArchivedInRange,
  countMaliciousCommentsInRange,
  countReviewQueue,
  getCategoryBreakdownInRange,
  getDailyMaliciousCounts,
} from "@/lib/db/queries/comments";
import { getNotifications } from "@/lib/db/queries/notifications";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function formatDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
}

function toDayKey(day: string | Date): string {
  const date = typeof day === "string" ? new Date(day) : day;
  return date.toISOString().slice(0, 10);
}

function percentChange(current: number, previous: number): number {
  return Math.round(((current - previous) / previous) * 100);
}

function buildInsights({
  thisWeekCount,
  lastWeekCount,
  repeatAuthorCount,
  archivedThisWeek,
  archivedLastWeek,
}: {
  thisWeekCount: number;
  lastWeekCount: number;
  repeatAuthorCount: number;
  archivedThisWeek: number;
  archivedLastWeek: number;
}): string[] {
  const insights: string[] = [];

  if (lastWeekCount > 0) {
    const percent = percentChange(thisWeekCount, lastWeekCount);
    if (percent > 0) {
      insights.push(`위험 댓글이 지난주보다 ${percent}% 증가했습니다.`);
    } else if (percent < 0) {
      insights.push(`위험 댓글이 지난주보다 ${Math.abs(percent)}% 감소했습니다.`);
    } else {
      insights.push("위험 댓글이 지난주와 동일한 수준입니다.");
    }
  } else if (thisWeekCount > 0) {
    insights.push(`위험 댓글 ${thisWeekCount}건이 새로 발생했습니다.`);
  }

  if (repeatAuthorCount > 0) {
    insights.push(`반복 위험 작성자 알림이 ${repeatAuthorCount}건 발생했습니다.`);
  }

  if (archivedLastWeek > 0) {
    const percent = percentChange(archivedThisWeek, archivedLastWeek);
    if (percent > 0) {
      insights.push(`증거 보관 건수가 지난주보다 ${percent}% 증가했습니다.`);
    } else if (percent < 0) {
      insights.push(`증거 보관 건수가 지난주보다 ${Math.abs(percent)}% 감소했습니다.`);
    }
  } else if (archivedThisWeek > 0) {
    insights.push(`이번 주 새로 보관한 증거가 ${archivedThisWeek}건 있습니다.`);
  }

  return insights;
}

export default async function SummaryPage({
  params,
}: {
  params: Promise<{ channelId: string }>;
}) {
  const { channelId } = await params;

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [
    totalThisWeek,
    thisWeekCount,
    lastWeekCount,
    reviewQueueCount,
    archivedTotal,
    archivedThisWeek,
    archivedLastWeek,
    categoryBreakdown,
    dailyCounts,
    notifications,
  ] = await Promise.all([
    countAnalyzedCommentsInRange(channelId, oneWeekAgo, now),
    countMaliciousCommentsInRange(channelId, oneWeekAgo, now),
    countMaliciousCommentsInRange(channelId, twoWeeksAgo, oneWeekAgo),
    countReviewQueue(channelId),
    countArchivedCommentsByChannelId(channelId),
    countArchivedInRange(channelId, oneWeekAgo, now),
    countArchivedInRange(channelId, twoWeeksAgo, oneWeekAgo),
    getCategoryBreakdownInRange(channelId, oneWeekAgo, now),
    getDailyMaliciousCounts(channelId, oneWeekAgo, now),
    getNotifications(channelId),
  ]);

  const repeatAuthorCount = notifications.filter(
    (n) =>
      n.type === "repeat_author" &&
      n.createdAt >= oneWeekAgo &&
      n.createdAt <= now,
  ).length;

  const history = notifications.filter((n) => n.type === "weekly_digest");

  const insights = buildInsights({
    thisWeekCount,
    lastWeekCount,
    repeatAuthorCount,
    archivedThisWeek,
    archivedLastWeek,
  });

  const countsByDay = new Map(
    dailyCounts.map((row) => [toDayKey(row.day), row.count]),
  );
  const bars = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - i));
    return {
      count: countsByDay.get(date.toISOString().slice(0, 10)) ?? 0,
      weekday: WEEKDAY_LABELS[date.getDay()],
    };
  });
  const maxDaily = Math.max(1, ...bars.map((bar) => bar.count));
  const categoryTotal = categoryBreakdown.reduce((sum, row) => sum + row.count, 0);

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8 sm:px-10">
      <header>
        <p className="text-xl font-semibold tracking-tight text-foreground">
          주간 요약
        </p>
        <p className="text-xs text-muted-foreground">
          {formatDate(oneWeekAgo)} ~ {formatDate(now)}, 지난주 대비 변화입니다.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl bg-card px-5 py-4">
          <p className="text-xs text-muted-foreground">총 댓글</p>
          <p className="mt-1 text-3xl font-semibold text-card-foreground">
            {totalThisWeek}
          </p>
        </div>
        <div className="rounded-2xl bg-card px-5 py-4">
          <p className="text-xs text-muted-foreground">위험 댓글</p>
          <p className="mt-1 text-3xl font-semibold text-card-foreground">
            {thisWeekCount}
          </p>
        </div>
        <div className="rounded-2xl bg-card px-5 py-4">
          <p className="text-xs text-muted-foreground">검토 필요</p>
          <p className="mt-1 text-3xl font-semibold text-card-foreground">
            {reviewQueueCount}
          </p>
        </div>
        <div className="rounded-2xl bg-card px-5 py-4">
          <p className="text-xs text-muted-foreground">증거 보관</p>
          <p className="mt-1 text-3xl font-semibold text-card-foreground">
            {archivedTotal}
          </p>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="flex flex-col gap-4 rounded-2xl bg-card px-5 py-4">
          <p className="text-sm font-medium text-card-foreground">
            일별 위험 댓글 추이
          </p>
          <div className="flex min-h-32 flex-1 gap-3 py-2">
            {bars.map((bar, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-sm bg-primary/70"
                    style={{ height: `${Math.max(4, (bar.count / maxDaily) * 100)}%` }}
                    title={`${bar.count}건`}
                  />
                </div>
                <span className="text-[11px] text-muted-foreground">
                  {bar.weekday}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-card px-5 py-4">
          <p className="mb-3 text-sm font-medium text-card-foreground">
            위험 유형별 비율
          </p>
          {categoryBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              이번 주 악성 댓글이 없습니다.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {categoryBreakdown.map((row) => (
                <div key={row.category} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-card-foreground">{row.category}</span>
                    <span className="font-mono text-muted-foreground">
                      {row.count}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-border">
                    <div
                      className="h-full bg-primary/70"
                      style={{
                        width: categoryTotal
                          ? `${(row.count / categoryTotal) * 100}%`
                          : "0%",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-card px-5 py-4">
        <p className="mb-3 text-sm font-medium text-card-foreground">
          이번 주 인사이트
        </p>
        {insights.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            이번 주 요약은 데이터가 쌓이면 자동으로 생성됩니다.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {insights.map((line, i) => (
              <li key={i} className="text-sm text-card-foreground">
                • {line}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          → 지속적인 모니터링이 필요합니다.
        </p>
      </div>

      <div>
        <p className="mb-3 text-sm font-medium text-foreground">
          지난 주간 요약 및 주요 인사이트
        </p>
        {history.length === 0 ? (
          <p className="rounded-2xl bg-card px-5 py-8 text-center text-sm text-muted-foreground">
            이번 주 요약은 데이터가 쌓이면 자동으로 생성됩니다.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {history.map((notification) => (
              <div
                key={notification.id}
                className="rounded-2xl bg-card px-5 py-4"
              >
                <p className="text-sm text-card-foreground">
                  {notification.message}
                </p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {formatDate(notification.createdAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
