import Link from "next/link";

import {
  countAnalyzedCommentsInRange,
  countArchivedCommentsByChannelId,
  countArchivedInRange,
  countMaliciousCommentsInRange,
  countReviewQueue,
  getCategoryBreakdownInRange,
  getDailyMaliciousCounts,
  getTopAuthorsByMaliciousCount,
  getTopVideosByMaliciousCount,
  getVideoTypeBreakdownInRange,
} from "@/lib/db/queries/comments";
import { getNotifications } from "@/lib/db/queries/notifications";

const TOP_RANK_LIMIT = 3;

const VIDEO_TYPE_LABELS: Record<"video" | "shorts", string> = {
  video: "동영상",
  shorts: "쇼츠",
};

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
      insights.push(`위험 댓글이 이전 7일보다 ${percent}% 증가했습니다.`);
    } else if (percent < 0) {
      insights.push(`위험 댓글이 이전 7일보다 ${Math.abs(percent)}% 감소했습니다.`);
    } else {
      insights.push("위험 댓글이 이전 7일과 동일한 수준입니다.");
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
      insights.push(`증거 보관 건수가 이전 7일보다 ${percent}% 증가했습니다.`);
    } else if (percent < 0) {
      insights.push(`증거 보관 건수가 이전 7일보다 ${Math.abs(percent)}% 감소했습니다.`);
    }
  } else if (archivedThisWeek > 0) {
    insights.push(`최근 7일간 새로 보관한 증거가 ${archivedThisWeek}건 있습니다.`);
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
    topAuthors,
    topVideos,
    videoTypeBreakdown,
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
    getTopAuthorsByMaliciousCount(channelId, TOP_RANK_LIMIT, oneWeekAgo, now),
    getTopVideosByMaliciousCount(channelId, oneWeekAgo, now, TOP_RANK_LIMIT),
    getVideoTypeBreakdownInRange(channelId, oneWeekAgo, now),
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
    <main className="flex flex-1 flex-col gap-4 px-6 py-6 sm:px-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xl font-semibold tracking-tight text-foreground">
            주간 요약
          </p>
          <p className="text-xs text-muted-foreground">
            이번 주의 활동을 한눈에 확인하세요.
          </p>
        </div>
        <span className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
          {formatDate(oneWeekAgo)} ~ {formatDate(now)}
        </span>
      </header>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* 왼쪽: 신경 써야 할 것 */}
        <div className="flex flex-col gap-2.5">
          <p className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
            신경 써야 할 것
          </p>

          <div className="rounded-2xl bg-card px-4 py-3">
            <p className="text-sm font-medium text-card-foreground">
              반복 위험 작성자 TOP{TOP_RANK_LIMIT}
            </p>
            {topAuthors.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                최근 7일간 반복된 위험 작성자가 없습니다.
              </p>
            ) : (
              <div className="mt-2 flex flex-col">
                {topAuthors.map((author, i) => (
                  <Link
                    key={author.authorChannelId}
                    href={`/c/${channelId}/authors/${encodeURIComponent(author.authorChannelId)}`}
                    className="flex items-center gap-3 border-b border-border py-2 text-sm transition-colors last:border-b-0 hover:bg-accent/50"
                  >
                    <span className="w-4 shrink-0 font-mono text-xs text-muted-foreground">
                      {i + 1}
                    </span>
                    <span className="flex-1 truncate text-card-foreground">
                      @{author.authorDisplayName ?? "알 수 없음"}
                    </span>
                    <span className="shrink-0 font-mono text-xs font-semibold text-risk-high">
                      {author.count}건
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-card px-4 py-3">
            <p className="text-sm font-medium text-card-foreground">
              위험 댓글 집중 영상 TOP{TOP_RANK_LIMIT}
            </p>
            {topVideos.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                최근 7일간 위험 댓글이 몰린 영상이 없습니다.
              </p>
            ) : (
              <div className="mt-2 flex flex-col">
                {topVideos.map((video, i) => (
                  <Link
                    key={video.videoId}
                    href={`/c/${channelId}/dashboard?video=${video.videoId}`}
                    className="flex items-center gap-3 border-b border-border py-2 text-sm transition-colors last:border-b-0 hover:bg-accent/50"
                  >
                    <span className="w-4 shrink-0 font-mono text-xs text-muted-foreground">
                      {i + 1}
                    </span>
                    <span className="flex-1 truncate text-card-foreground">
                      {video.videoTitle ?? video.videoId}
                    </span>
                    <span className="shrink-0 font-mono text-xs font-semibold text-risk-high">
                      {video.count}건
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-card px-4 py-3">
            <p className="mb-2 text-sm font-medium text-card-foreground">
              최근 7일 인사이트
            </p>
            {insights.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                최근 7일 요약은 데이터가 쌓이면 자동으로 생성됩니다.
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
            <p className="mt-2 text-xs text-muted-foreground">
              → 지속적인 모니터링이 필요합니다.
            </p>
          </div>

          <div className="rounded-2xl bg-card px-4 py-3">
            <p className="mb-2 text-sm font-medium text-card-foreground">
              지난 주간 요약 이력
            </p>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                최근 7일 요약은 데이터가 쌓이면 자동으로 생성됩니다.
              </p>
            ) : (
              <div className="flex flex-col">
                {history.map((notification) => (
                  <div
                    key={notification.id}
                    className="border-b border-border py-2 last:border-b-0"
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
        </div>

        {/* 오른쪽: 전체 데이터 */}
        <div className="flex flex-col gap-2.5">
          <p className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
            전체 데이터
          </p>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl bg-card px-4 py-3">
              <p className="text-xs text-muted-foreground">총 댓글</p>
              <p className="mt-1 text-2xl font-semibold text-card-foreground">
                {totalThisWeek}
              </p>
            </div>
            <div className="rounded-2xl bg-card px-4 py-3">
              <p className="text-xs text-muted-foreground">위험 댓글</p>
              <p className="mt-1 text-2xl font-semibold text-card-foreground">
                {thisWeekCount}
              </p>
            </div>
            <div className="rounded-2xl bg-card px-4 py-3">
              <p className="text-xs text-muted-foreground">검토 필요</p>
              <p className="mt-1 text-2xl font-semibold text-card-foreground">
                {reviewQueueCount}
              </p>
            </div>
            <div className="rounded-2xl bg-card px-4 py-3">
              <p className="text-xs text-muted-foreground">증거 보관</p>
              <p className="mt-1 text-2xl font-semibold text-card-foreground">
                {archivedTotal}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-2xl bg-card px-4 py-3">
            <p className="text-sm font-medium text-card-foreground">
              일별 위험 댓글 추이
            </p>
            <div className="flex h-14 gap-2">
              {bars.map((bar, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className="flex w-full flex-1 items-end">
                    {bar.count > 0 && (
                      <div
                        className="w-full rounded-sm bg-primary/70"
                        style={{ height: `${(bar.count / maxDaily) * 100}%` }}
                        title={`${bar.count}건`}
                      />
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {bar.weekday}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-card px-4 py-3">
            <p className="mb-2 text-sm font-medium text-card-foreground">
              위험 유형별 비율
            </p>
            {categoryBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                최근 7일간 악성 댓글이 없습니다.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {categoryBreakdown.map((row) => (
                  <div key={row.category} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-card-foreground">{row.category}</span>
                      <span className="font-mono text-muted-foreground">
                        {row.count}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-border">
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

          <div className="rounded-2xl bg-card px-4 py-3">
            <p className="text-sm font-medium text-card-foreground">
              쇼츠 vs 동영상 비교
            </p>
            {videoTypeBreakdown.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                최근 7일간 분석된 댓글이 없습니다.
              </p>
            ) : (
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {(["video", "shorts"] as const).map((type) => {
                  const row = videoTypeBreakdown.find((r) => r.videoType === type);
                  const total = row?.total ?? 0;
                  const malicious = row?.malicious ?? 0;
                  const ratio = total > 0 ? Math.round((malicious / total) * 100) : 0;
                  return (
                    <div key={type} className="rounded-xl border border-border px-3 py-2.5">
                      <p className="text-xs text-muted-foreground">
                        {VIDEO_TYPE_LABELS[type]}
                      </p>
                      <p className="mt-0.5 text-xl font-semibold text-card-foreground">
                        {ratio}%
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        위험 댓글 {malicious}건 · 전체 {total}건
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
