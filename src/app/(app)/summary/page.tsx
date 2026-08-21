import { redirect } from "next/navigation";

import { RiskBadge } from "@/components/dashboard/risk-badge";
import {
  countMaliciousCommentsInRange,
  getRiskBreakdownInRange,
} from "@/lib/db/queries/comments";
import { getNotifications } from "@/lib/db/queries/notifications";
import { formatWeekDiff } from "@/lib/format/week-diff";
import { createClient } from "@/lib/supabase/server";

const RISK_BAR_CLASSES = {
  high: "bg-risk-high",
  medium: "bg-risk-medium",
  low: "bg-risk-low",
} as const;

function formatDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
}

export default async function SummaryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [thisWeekCount, lastWeekCount, breakdown, notifications] =
    await Promise.all([
      countMaliciousCommentsInRange(user.id, oneWeekAgo, now),
      countMaliciousCommentsInRange(user.id, twoWeeksAgo, oneWeekAgo),
      getRiskBreakdownInRange(user.id, oneWeekAgo, now),
      getNotifications(user.id),
    ]);

  const history = notifications.filter((n) => n.type === "weekly_digest");

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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-card px-5 py-4">
          <p className="text-xs text-muted-foreground">이번 주 위험 댓글</p>
          <p className="mt-1 text-3xl font-semibold text-card-foreground">
            {thisWeekCount}
          </p>
        </div>
        <div className="rounded-2xl bg-card px-5 py-4">
          <p className="text-xs text-muted-foreground">지난주 대비</p>
          <p className="mt-1 text-3xl font-semibold text-card-foreground">
            {formatWeekDiff(thisWeekCount, lastWeekCount)}
          </p>
        </div>
        <div className="rounded-2xl bg-card px-5 py-4">
          <p className="text-xs text-muted-foreground">지난주 위험 댓글</p>
          <p className="mt-1 text-3xl font-semibold text-card-foreground">
            {lastWeekCount}
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-card px-5 py-4">
        <p className="mb-3 text-sm font-medium text-card-foreground">
          이번 주 위험도 분해
        </p>
        <div className="flex flex-col gap-3">
          {(["high", "medium", "low"] as const).map((level) => (
            <div key={level} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-sm">
                <RiskBadge riskLevel={level} />
                <span className="font-mono text-muted-foreground">
                  {breakdown[level]}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-border">
                <div
                  className={`h-full ${RISK_BAR_CLASSES[level]}`}
                  style={{
                    width: thisWeekCount
                      ? `${(breakdown[level] / thisWeekCount) * 100}%`
                      : "0%",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-3 text-sm font-medium text-foreground">
          지난 주간 요약 알림 기록
        </p>
        {history.length === 0 ? (
          <p className="rounded-2xl bg-card px-5 py-8 text-center text-sm text-muted-foreground">
            아직 생성된 주간 요약 알림이 없습니다. 위 수치는 지금 이 순간
            기준으로 실시간 계산된 값입니다 — 요일마다 매번 새로 생성되는
            알림과는 별개로 언제든 확인할 수 있습니다.
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
