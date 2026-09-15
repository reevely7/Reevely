# Reevely 주간 요약 화면 리디자인 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 주간 요약(`/c/[channelId]/summary`) 화면을 PPT 스펙대로 재구성한다 — KPI를 4개(총 댓글/위험 댓글/검토 필요/증거 보관)로 바꾸고, 위험도별 분해 대신 카테고리별 비율("위험 유형별 비율")을 보여주며, 일별 추이 그래프와 규칙 기반 "이번 주 인사이트" 텍스트 카드를 추가한다.

**Architecture:** 서버 컴포넌트 하나(`summary/page.tsx`)가 여러 쿼리를 `Promise.all`로 병렬 조회하고, 인사이트 문장은 페이지 내 로컬 함수(`buildInsights`)가 순수 계산으로 생성한다 — 이 화면은 상태를 가진 인터랙션이 없어 별도 클라이언트 컴포넌트가 필요 없다.

**Tech Stack:** Next.js App Router (Server Components), Drizzle ORM, Tailwind CSS v4, TypeScript.

**Spec:** `docs/superpowers/specs/2026-09-15-reevely-ui-redesign.md`의 "09. 주간 요약 (PPT p.10)" 섹션.

## Global Constraints

- **KPI 4개 중 "검토 필요"·"증거 보관"은 누적 전체(all-time) 수치다** (사용자 확정, 2026-09-16) — "이번 주" 기간으로 필터링하지 않는다(검토 큐는 원래 시점 개념이 없고, 증거 보관 총량은 계속 쌓이는 자산이라 누적이 자연스러움). "총 댓글"·"위험 댓글"은 기존처럼 이번 주(최근 7일) 기간 한정이다.
- **"위험 유형별 비율"은 위험도(High/Medium/Low)가 아니라 카테고리(명예훼손/협박/성희롱 등)별 비율이다** (사용자 확정, 2026-09-16) — 기존의 위험도 분해 UI를 대체한다(같이 두지 않음).
- **"이번 주 인사이트" 텍스트 카드는 규칙 기반 문장 여러 개를 생성한다** (사용자 확정, 2026-09-16, "만들어줘") — (1) 위험 댓글 지난주 대비 증감률, (2) 이번 주 발생한 반복 위험 작성자(`repeat_author`) 알림 건수, (3) 증거 보관 건수 지난주 대비 증감. 셋 다 데이터가 없으면(0건이거나 비교 대상이 없으면) 해당 문장은 생략하고, 전부 생략되면 "이번 주 요약은 데이터가 쌓이면 자동으로 생성됩니다."로 대체한다. 문장 목록 아래에는 항상 "→ 지속적인 모니터링이 필요합니다." 안내를 고정으로 둔다(PPT 목업 반영).
- **"지난 주간 요약 알림 기록" 섹션(과거에 실제로 생성된 `weekly_digest` 알림 히스토리)은 지금 그대로 유지한다** (사용자 확정, 2026-09-16) — 페이지 전체에 별도의 "전체 빈 화면" 상태를 새로 만들지 않는다. 다만 스펙 09번 문구표에 따라 이 섹션의 제목("지난 주간 요약 알림 기록"→"지난 주간 요약 및 주요 인사이트")과 빈 상태 문구("아직 생성된 주간 요약 알림이 없습니다. ..."→"이번 주 요약은 데이터가 쌓이면 자동으로 생성됩니다.")는 스펙 그대로 갱신한다.
- **일별 추이 그래프는 대시보드의 `DailyTrendCard`를 그대로 import하지 않는다** — 그 컴포넌트는 대시보드 전용 헤더("최근 N일 위험 댓글 추이")와 "주간 요약 보기 →" 자기 참조 링크를 포함하고 있어 주간 요약 페이지 안에 그대로 쓰면 어색하다. 막대 렌더링 로직만 이 페이지에 맞는 헤더로 로컬 재구현한다(이 코드베이스의 기존 관례 — 화면마다 작은 시각화 로직 중복 허용).
- 이 저장소에는 자동화 테스트 프레임워크가 없다 — "테스트"는 `npx tsc --noEmit && npm run lint` 통과.
- **주간 요약도 로그인 필요 화면 — 자동 브라우저 검증 안 함** (사용자 확정, 2026-09-15).
- 커밋 전 `npx tsc --noEmit && npm run lint` 통과 확인, 커밋 메시지 `feat|refactor: 간결한 설명`, `any` 금지, `console.log` 금지, DB 직접 접근 금지 — CLAUDE.md 원칙.

---

## 파일 구조 개요

| 파일 | 변경 여부 | 비고 |
|---|---|---|
| `src/lib/db/queries/comments.ts` | 수정 | `countAnalyzedCommentsInRange`, `getCategoryBreakdownInRange`, `countArchivedCommentsByChannelId`, `countArchivedInRange` 4개 함수 신규 추가 |
| `src/app/(app)/c/[channelId]/summary/page.tsx` | 수정 | KPI 4개 재구성, 카테고리 비율, 일별 추이, 인사이트 카드로 전체 재작성 |

---

### Task 1: DB 레이어 — 주간 요약용 신규 집계 쿼리 4개 추가

**Files:**
- Modify: `src/lib/db/queries/comments.ts`

**Interfaces:**
- Consumes: 없음
- Produces (Task 2가 전부 소비):
  - `countAnalyzedCommentsInRange(channelId: string, from: Date, to: Date): Promise<number>`
  - `getCategoryBreakdownInRange(channelId: string, from: Date, to: Date): Promise<Array<{ category: string; count: number }>>` (건수 내림차순)
  - `countArchivedCommentsByChannelId(channelId: string): Promise<number>`
  - `countArchivedInRange(channelId: string, from: Date, to: Date): Promise<number>`

이 파일에 필요한 `and`, `eq`, `gte`, `lt`, `sql`, `desc`, `isNotNull`은 이미 전부 import되어 있다(theme-04/05 단계에서 추가됨) — import 수정 불필요.

- [ ] **Step 1: `countAnalyzedCommentsByChannelId` 함수 바로 아래에 기간 한정 버전 추가**

```ts
// 주간 요약 KPI "총 댓글" — 기간 내 분석 완료된 전체 댓글 수(악성 여부 무관)
export async function countAnalyzedCommentsInRange(
  channelId: string,
  from: Date,
  to: Date,
) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(comments)
    .where(
      and(
        eq(comments.channelId, channelId),
        isNotNull(comments.isMalicious),
        gte(comments.createdAt, from),
        lt(comments.createdAt, to),
      ),
    );

  return row?.count ?? 0;
}
```

- [ ] **Step 2: `getRiskBreakdownInRange` 함수 바로 아래에 카테고리 버전 추가**

```ts
// 주간 요약 "위험 유형별 비율"용 — 기간 내 악성 댓글의 카테고리별 집계(건수 내림차순)
export async function getCategoryBreakdownInRange(
  channelId: string,
  from: Date,
  to: Date,
) {
  const rows = await db
    .select({
      category: comments.category,
      count: sql<number>`count(*)::int`,
    })
    .from(comments)
    .where(
      and(
        eq(comments.channelId, channelId),
        eq(comments.isMalicious, true),
        gte(comments.createdAt, from),
        lt(comments.createdAt, to),
      ),
    )
    .groupBy(comments.category)
    .orderBy(desc(sql`count(*)`));

  return rows.filter(
    (row): row is { category: string; count: number } => row.category !== null,
  );
}
```

- [ ] **Step 3: `getArchivedComments` 함수 바로 아래에 카운트 함수 2개 추가**

```ts
// 주간 요약 KPI "증거 보관"(누적 전체) — 이 채널에서 현재 보관 중인 증거 건수
export async function countArchivedCommentsByChannelId(channelId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(comments)
    .where(and(eq(comments.channelId, channelId), eq(comments.isArchived, true)));

  return row?.count ?? 0;
}

// 주간 요약 인사이트용 — 기간 내 새로 보관된(archivedAt 기준) 증거 건수
export async function countArchivedInRange(
  channelId: string,
  from: Date,
  to: Date,
) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(comments)
    .where(
      and(
        eq(comments.channelId, channelId),
        eq(comments.isArchived, true),
        gte(comments.archivedAt, from),
        lt(comments.archivedAt, to),
      ),
    );

  return row?.count ?? 0;
}
```

- [ ] **Step 4: 빌드 확인**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음

- [ ] **Step 5: 커밋**

```bash
git add src/lib/db/queries/comments.ts
git commit -m "feat: 주간 요약용 기간별 분석량·카테고리·증거보관 집계 쿼리 추가"
```

---

### Task 2: 주간 요약 페이지 전체 재구성 (KPI 4개·카테고리 비율·일별 추이·인사이트)

**Files:**
- Modify: `src/app/(app)/c/[channelId]/summary/page.tsx`

**Interfaces:**
- Consumes: Task 1의 4개 함수, 기존 `countMaliciousCommentsInRange`/`countReviewQueue`/`getDailyMaliciousCounts`(comments.ts)와 `getNotifications`(notifications.ts)
- Produces: 없음

- [ ] **Step 1: `summary/page.tsx` 전체를 아래로 교체**

```tsx
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
```

- [ ] **Step 2: 빌드 확인**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add "src/app/(app)/c/[channelId]/summary/page.tsx"
git commit -m "feat: 주간 요약 페이지를 KPI 4개·카테고리 비율·인사이트 카드로 재구성"
```

---

### Task 3: 검증 (코드 리뷰 기준, 자동 로그인 없음)

**Files:** 없음 (검증 전용 태스크)

- [ ] **Step 1: 전체 빌드 확인**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음

- [ ] **Step 2: 스펙 대조 체크리스트**

`docs/superpowers/specs/2026-09-15-reevely-ui-redesign.md`의 "09. 주간 요약" 섹션과 대조:
- KPI 4개(총 댓글/위험 댓글/검토 필요/증거 보관)가 정확한 값을 보여주는지 — 검토 필요·증거 보관은 누적, 총 댓글·위험 댓글은 이번 주 기간
- "위험 유형별 비율"이 위험도가 아니라 카테고리 기준인지
- 일별 추이 그래프가 최근 7일치를 표시하는지
- "이번 주 인사이트" 카드가 데이터 유무에 따라 문장을 늘리거나 fallback 문구를 보여주는지, "지속적인 모니터링이 필요합니다" 안내가 항상 있는지
- "지난 주간 요약 및 주요 인사이트" 섹션 제목·빈 상태 문구가 스펙 문구로 바뀌었는지

- [ ] **Step 3: `analysis.risk_level`/카테고리 관련 회귀 확인 (코드 리딩)**

`getCategoryBreakdownInRange`가 `getCategoryBreakdownByAuthor`(theme-04에서 추가)와 카테고리 집계 로직이 일관되는지, `countArchivedInRange`가 `archivedAt` null 값(보관 해제된 댓글)을 안전하게 걸러내는지(`gte`/`lt`는 null과 비교 시 false를 반환하므로 자동으로 걸러짐) 확인.

- [ ] **Step 4: 사용자에게 수동 확인 요청**

보고서에 "주간 요약 화면은 `/c/[channelId]/summary`에서 로그인 후 직접 확인해주세요 — 특히 KPI 4개 숫자가 실제 데이터와 맞는지, 인사이트 문장이 자연스러운지 확인 필요"라는 안내를 남긴다.

- [ ] **Step 5: 문제 발견 시 해당 태스크로 돌아가 수정**
