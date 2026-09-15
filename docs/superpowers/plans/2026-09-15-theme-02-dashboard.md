# Reevely 대시보드 화면 리디자인 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 대시보드(`/c/[channelId]/dashboard`)를 "악플 원문 목록"에서 "AI가 대신 확인한 보호 성과"를 보여주는 화면으로 재구성한다 — PPT p.5 AFTER 목업의 헤더 인사말, 4개 KPI 카드, AI 요약 우선 최근 위험 알림, 반복 위험 작성자 TOP5 구조로 전환. 컬러/버튼/배지 토큰은 이미 `theme-01-design-system` 플랜에서 전환 완료했으므로 이번 플랜은 그 위에서 구조·문구·데이터 배선만 다룬다.

**Architecture:** Next.js Server Component 페이지(`dashboard/page.tsx`)가 여러 `src/lib/db/queries/`의 쿼리 결과를 `Promise.all`로 모아 각 카드 컴포넌트(`src/components/dashboard/*.tsx`)에 props로 내려주는 기존 구조를 그대로 따른다. 새 KPI 2개(악성 비율, 보호된 댓글) 중 "보호된 댓글"은 이미 가져온 `summary` 값으로 계산 가능하고, "악성 비율"만 새 쿼리(분석 완료 전체 건수)가 필요하다. `SummaryTiles` 컴포넌트의 prop 타입 변경과 그걸 소비하는 `page.tsx` 배선은 **하나의 태스크(Task 2)**로 묶는다 — 둘을 나누면 그 사이 커밋에서 프로젝트 전체 `tsc` 빌드가 깨져 "커밋마다 tsc/lint 통과" 원칙과 충돌하기 때문.

**Tech Stack:** Next.js App Router (Server Components), Drizzle ORM, Tailwind CSS v4, TypeScript.

**Spec:** `docs/superpowers/specs/2026-09-15-reevely-ui-redesign.md`의 "04. 대시보드 (PPT p.5)" 섹션. 브랜드 팔레트·배지 pill 스타일은 `docs/superpowers/plans/2026-09-15-theme-01-design-system.md`에서 이미 반영됨 (참고만, 재작업 없음).

## Global Constraints

- 이 저장소에는 자동화 테스트 프레임워크가 없다. 각 태스크의 "테스트"는 `npx tsc --noEmit && npm run lint` 통과로 확인한다. **모든 태스크는 커밋 시점에 프로젝트 전체가 빌드되는 상태를 유지해야 한다** — 중간에 깨진 빌드를 다음 태스크로 넘기지 않는다.
- **대시보드는 로그인 필요 화면이라 자동 브라우저 검증(Playwright 로그인)을 하지 않는다** — 사용자가 직접 로그인해서 육안 확인하기로 확정함(2026-09-15). 어떤 태스크에서도 자동 로그인을 시도하거나 카카오 계정 자격증명을 요청하지 않는다.
- 아래 4가지는 대화에서 이미 확정된 데이터 정의이며, 태스크 구현 시 재논의하지 않고 그대로 적용한다:
  1. 헤더는 PPT 목업대로 인사말+날짜범위+최근 갱신 구조로 전면 교체한다.
  2. **악성 비율** = 채널에 수집되어 **분석이 끝난 전체 댓글**(악성+정상) 대비 악성 판정 비율(%).
  3. **보호된 댓글** = 검토가 끝나 확정 처리된 악성 댓글 수 (`전체 악성 - 검토 필요`).
  4. "요주의 작성자" 위젯은 PPT 목업대로 **하나(누적 TOP5)**로 통합하고 "최근 7일" 위젯은 제거한다.
- 컬러/버튼/배지는 이미 토큰화되어 있으므로 이 플랜의 어떤 태스크도 하드코딩 hex를 추가하지 않는다 — 전부 `bg-primary`, `text-risk-high`, `bg-status-needs-review-bg` 같은 기존 Tailwind 토큰 클래스만 사용한다.
- 커밋 전 `npx tsc --noEmit && npm run lint` 통과 확인 (CLAUDE.md)
- 커밋 메시지: `feat|refactor: 간결한 설명` (구조 변경은 refactor, 새 쿼리/KPI 추가는 feat)
- `any` 타입 금지, 프로덕션 코드 `console.log` 금지, 컴포넌트/페이지에서 DB 직접 접근 금지 (전부 `src/lib/db/queries/` 경유) — CLAUDE.md 원칙

---

## 파일 구조 개요

| 파일 | 변경 여부 | 비고 |
|---|---|---|
| `src/lib/db/queries/comments.ts` | 수정 | `countAnalyzedCommentsByChannelId` 쿼리 함수 추가 |
| `src/components/dashboard/summary-tiles.tsx` | **구조 변경** | 5개(전체/High/Medium/Low/검토필요) → 4개(총댓글/검토필요/악성비율/보호된댓글) KPI 카드, 아이콘 추가 |
| `src/app/(app)/c/[channelId]/dashboard/page.tsx` | **구조 변경** | 헤더 재구성, 새 쿼리 호출·KPI 계산, 작성자 위젯 1개로 통합 (SummaryTiles 변경과 한 태스크) |
| `src/components/dashboard/recent-comments-preview.tsx` | 수정 | 타이틀 "최근 위험 댓글"→"최근 위험 알림", 표시 필드 원문(`text`)→AI 요약(`reason`) |
| `src/components/dashboard/plan-usage-card.tsx` | 수정 | 타이틀 "이번 달 사용량 · {플랜} 플랜" → "채널 사용량" |
| `src/components/dashboard/repeat-author-notifications-card.tsx` | 수정 | 타이틀 "구독 제안" → "집중 모니터링 제안" |
| `src/components/dashboard/daily-trend-card.tsx`, `top-authors-card.tsx`, `top-videos-card.tsx` | **변경 없음** | 이미 토큰 기반, PPT가 요구하는 구조와 일치 (top-authors-card는 title prop만 page.tsx에서 바뀜) |

---

### Task 1: 채널별 분석 완료 댓글 수 쿼리 추가

**Files:**
- Modify: `src/lib/db/queries/comments.ts`

**Interfaces:**
- Consumes: 없음
- Produces: `countAnalyzedCommentsByChannelId(channelId: string): Promise<number>` — Task 2(page.tsx)가 악성 비율 분모로 소비.

- [ ] **Step 1: `getDashboardSummary` 함수(약 270~290행) 바로 아래에 새 함수 추가**

```ts
// 대시보드 "악성 비율" KPI 분모 — 채널에 수집된 댓글 중 AI 분석이 끝난 전체 건수
// (악성 여부와 무관하게 isMalicious가 null이 아니면 분석 완료)
export async function countAnalyzedCommentsByChannelId(channelId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(comments)
    .where(
      and(eq(comments.channelId, channelId), isNotNull(comments.isMalicious)),
    );

  return row?.count ?? 0;
}
```

`isNotNull`은 파일 상단 drizzle-orm import에 이미 포함되어 있다 (`import { ..., isNotNull, ... } from "drizzle-orm"`) — 추가 import 불필요.

- [ ] **Step 2: 빌드 확인**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add src/lib/db/queries/comments.ts
git commit -m "feat: 채널별 분석 완료 댓글 수 카운트 쿼리 추가"
```

---

### Task 2: SummaryTiles 4-KPI 재구성 + 대시보드 페이지 배선

**Files:**
- Modify: `src/components/dashboard/summary-tiles.tsx`
- Modify: `src/app/(app)/c/[channelId]/dashboard/page.tsx`

**Interfaces:**
- Consumes: Task 1의 `countAnalyzedCommentsByChannelId(channelId)`
- Produces: `SummaryTiles`의 새 prop 타입 `DashboardKpis = { totalMalicious: number; needsReview: number; maliciousRate: number; protectedCount: number }` — 이 태스크 안에서 정의와 소비를 함께 끝낸다. Task 3(`RecentCommentsPreview`)·Task 4(타이틀 카피)는 이 변경과 무관하게 독립적으로 진행 가능.

이 태스크는 두 파일을 함께 바꾸고 하나로 커밋한다 — `SummaryTiles`의 prop 모양이 바뀌는 순간 `page.tsx`도 같이 바뀌어야 프로젝트가 빌드되기 때문이다.

- [ ] **Step 1: `summary-tiles.tsx` 파일 전체를 아래로 교체**

```tsx
import { CircleCheck, MessageSquareWarning, Percent, TimerReset } from "lucide-react";
import Link from "next/link";

type DashboardKpis = {
  totalMalicious: number;
  needsReview: number;
  maliciousRate: number;
  protectedCount: number;
};

const TILES: Array<{
  key: keyof DashboardKpis;
  label: string;
  suffix: string;
  hrefSuffix: string;
  icon: typeof MessageSquareWarning;
  iconClassName: string;
}> = [
  {
    key: "totalMalicious",
    label: "총 댓글",
    suffix: "",
    hrefSuffix: "",
    icon: MessageSquareWarning,
    iconClassName: "bg-muted text-muted-foreground",
  },
  {
    key: "needsReview",
    label: "검토 필요",
    suffix: "",
    hrefSuffix: "?status=needs_review",
    icon: TimerReset,
    iconClassName: "bg-status-needs-review-bg text-status-needs-review",
  },
  {
    key: "maliciousRate",
    label: "악성 비율",
    suffix: "%",
    hrefSuffix: "",
    icon: Percent,
    iconClassName: "bg-risk-high-bg text-risk-high",
  },
  {
    key: "protectedCount",
    label: "보호된 댓글",
    suffix: "",
    hrefSuffix: "",
    icon: CircleCheck,
    iconClassName: "bg-status-confirmed-bg text-status-confirmed",
  },
];

export function SummaryTiles({
  kpis,
  channelId,
}: {
  kpis: DashboardKpis;
  channelId: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {TILES.map((tile) => {
        const Icon = tile.icon;
        return (
          <Link
            key={tile.key}
            href={`/c/${channelId}/comments${tile.hrefSuffix}`}
            className="flex flex-col gap-2 rounded-2xl bg-card px-4 py-4 transition-colors hover:bg-accent/50"
          >
            <span
              aria-hidden
              className={`flex size-7 shrink-0 items-center justify-center rounded-full ${tile.iconClassName}`}
            >
              <Icon className="size-3.5" aria-hidden />
            </span>
            <span className="text-xs text-muted-foreground">
              {tile.label}
            </span>
            <p className="text-3xl font-semibold text-card-foreground">
              {kpis[tile.key].toLocaleString("ko-KR")}
              {tile.suffix}
            </p>
          </Link>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: `page.tsx` 헤더를 인사말+날짜범위+최근 갱신 구조로 교체**

`src/app/(app)/c/[channelId]/dashboard/page.tsx`에서 헤더 부분:
```tsx
      <header>
        <p className="text-xl font-semibold tracking-tight text-foreground">
          대시보드
        </p>
        <p className="text-xs text-muted-foreground">
          {channel.channelTitle} 채널의 위험 댓글 현황입니다.
        </p>
      </header>
```
를 아래로 교체:
```tsx
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xl font-semibold tracking-tight text-foreground">
            안녕하세요! 👋
          </p>
          <p className="text-xs text-muted-foreground">
            오늘도 안전한 창작 활동을 응원해요.
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-xs text-muted-foreground">
            {formatHeaderDate(oneWeekAgo)} - {formatHeaderDate(now)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            최근 갱신{" "}
            {channel.lastSyncedAt
              ? formatClockTime(channel.lastSyncedAt)
              : "-"}
          </p>
        </div>
      </header>
```

- [ ] **Step 3: import 추가 및 날짜 포맷 헬퍼 추가**

파일 상단 import 목록에 `formatClockTime` 추가:
```tsx
import { formatClockTime } from "@/lib/format/clock-time";
```

`RECENT_COMMENTS_LIMIT` 상수 선언 위쪽에 헬퍼 함수 추가:
```tsx
function formatHeaderDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
}
```

- [ ] **Step 4: `topAuthorsThisWeek` 쿼리 호출 제거, `countAnalyzedCommentsByChannelId` 추가**

`Promise.all` 배열에서 `getTopAuthorsByMaliciousCount(channelId, TOP_LIST_LIMIT, oneWeekAgo)`(최근 7일 작성자, `topAuthorsThisWeek`로 구조분해되던 항목) 줄을 제거하고, 그 자리에 `countAnalyzedCommentsByChannelId(channelId)`를 추가한다:

```tsx
  const [
    summary,
    recentComments,
    allNotifications,
    dailyCounts,
    thisWeekCount,
    lastWeekCount,
    topAuthorsAllTime,
    analyzedCount,
    topVideos,
    subscription,
    monthlyAnalysisLimit,
    monthlyAnalysisUsed,
    evidenceArchiveLimit,
    evidenceArchiveUsed,
    channelLimit,
    channelsUsed,
    videoLimit,
  ] = await Promise.all([
    getDashboardSummary(channelId),
    getFlaggedComments(channelId, { sort: "risk" }, 1, RECENT_COMMENTS_LIMIT),
    getNotifications(channelId, 30),
    getDailyMaliciousCounts(channelId, oneWeekAgo, now),
    countMaliciousCommentsInRange(channelId, oneWeekAgo, now),
    countMaliciousCommentsInRange(channelId, twoWeeksAgo, oneWeekAgo),
    getTopAuthorsByMaliciousCount(channelId, TOP_LIST_LIMIT),
    countAnalyzedCommentsByChannelId(channelId),
    getTopVideosByMaliciousCount(channelId, oneWeekAgo, TOP_LIST_LIMIT),
    getSubscriptionByUserId(channel.userId),
    getMonthlyAnalysisLimitForUser(channel.userId),
    countAnalyzedCommentsThisMonthByUserId(channel.userId),
    getEvidenceArchiveLimitForUser(channel.userId),
    countArchivedCommentsByUserId(channel.userId),
    getChannelLimitForUser(channel.userId),
    countActiveChannelsByUserId(channel.userId),
    getVideoLimitForUser(channel.userId),
  ]);
```

`countAnalyzedCommentsByChannelId`를 `@/lib/db/queries/comments`의 기존 import 목록에 추가한다 (같은 줄에서 이미 `getDashboardSummary` 등을 가져오고 있음).

- [ ] **Step 5: KPI 값 계산 (Promise.all 다음, `planLabel` 선언 근처)**

```tsx
  const planLabel = subscription ? PLAN_LABELS[subscription.plan] : "무료";
  const isPro = subscription?.plan === "pro";

  const maliciousRate =
    analyzedCount > 0 ? Math.round((summary.total / analyzedCount) * 100) : 0;
  const protectedCount = Math.max(0, summary.total - summary.needsReview);
```

- [ ] **Step 6: `SummaryTiles` 호출을 새 `kpis` prop 형태로 교체**

```tsx
      <SummaryTiles
        kpis={{
          totalMalicious: summary.total,
          needsReview: summary.needsReview,
          maliciousRate,
          protectedCount,
        }}
        channelId={channelId}
      />
```

- [ ] **Step 7: 작성자 위젯을 하나로 통합하고 레이아웃 재배치**

기존의 `DailyTrendCard`+`PlanUsageCard` 그리드, `RecentCommentsPreview`, `TopAuthorsCard`×2 그리드, `TopVideosCard`+`RepeatAuthorNotificationsCard` 그리드 네 블록을:

```tsx
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DailyTrendCard
          dailyCounts={dailyCounts}
          days={TREND_DAYS}
          thisWeekCount={thisWeekCount}
          lastWeekCount={lastWeekCount}
          channelId={channelId}
        />
        <PlanUsageCard
          planLabel={planLabel}
          isPro={isPro}
          monthlyAnalysis={{
            label: "월 댓글 분석량",
            used: monthlyAnalysisUsed,
            limit: monthlyAnalysisLimit,
          }}
          videos={{
            label: "모니터링 영상 수",
            used: channel.monitoredVideoCount,
            limit: videoLimit,
          }}
          evidenceArchive={{
            label: "증거 보관함",
            used: evidenceArchiveUsed,
            limit: evidenceArchiveLimit,
          }}
          channels={{
            label: "채널 연동",
            used: channelsUsed,
            limit: channelLimit,
          }}
        />
      </div>

      <RecentCommentsPreview rows={recentComments} channelId={channelId} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TopAuthorsCard
          title="요주의 작성자 (누적)"
          rows={topAuthorsAllTime}
          channelId={channelId}
        />
        <TopAuthorsCard
          title="요주의 작성자 (최근 7일)"
          rows={topAuthorsThisWeek}
          channelId={channelId}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TopVideosCard rows={topVideos} channelId={channelId} />
        <RepeatAuthorNotificationsCard rows={repeatAuthorNotifications} />
      </div>
```

전부 아래로 교체한다 (스펙이 "최근 7일 추이 + 반복 위험 작성자 TOP5"를 한 쌍으로 묶으라고 했으므로 `TopAuthorsCard`를 `DailyTrendCard`와 같은 그리드로 옮기고, "채널 사용량"은 그 아래 `TopVideosCard`와 짝짓는다):

```tsx
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DailyTrendCard
          dailyCounts={dailyCounts}
          days={TREND_DAYS}
          thisWeekCount={thisWeekCount}
          lastWeekCount={lastWeekCount}
          channelId={channelId}
        />
        <TopAuthorsCard
          title="반복 위험 작성자 TOP 5"
          rows={topAuthorsAllTime}
          channelId={channelId}
        />
      </div>

      <RecentCommentsPreview rows={recentComments} channelId={channelId} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PlanUsageCard
          planLabel={planLabel}
          isPro={isPro}
          monthlyAnalysis={{
            label: "월 댓글 분석량",
            used: monthlyAnalysisUsed,
            limit: monthlyAnalysisLimit,
          }}
          videos={{
            label: "모니터링 영상 수",
            used: channel.monitoredVideoCount,
            limit: videoLimit,
          }}
          evidenceArchive={{
            label: "증거 보관함",
            used: evidenceArchiveUsed,
            limit: evidenceArchiveLimit,
          }}
          channels={{
            label: "채널 연동",
            used: channelsUsed,
            limit: channelLimit,
          }}
        />
        <TopVideosCard rows={topVideos} channelId={channelId} />
      </div>

      <RepeatAuthorNotificationsCard rows={repeatAuthorNotifications} />
```

(`TOP_LIST_LIMIT`으로 여전히 `getTopAuthorsByMaliciousCount(channelId, TOP_LIST_LIMIT)` 1회만 호출되므로 상수 자체는 변경 불필요. `PlanUsageCard`·`TopVideosCard`·`RepeatAuthorNotificationsCard`는 이 태스크에서 내부 구현을 바꾸지 않는다 — 타이틀 카피만 Task 4에서 바뀐다.)

- [ ] **Step 8: 빌드 확인**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음 — `summary-tiles.tsx`와 `page.tsx`가 같은 커밋에 있으므로 이 시점에 전체 프로젝트가 정상 빌드되어야 한다.

- [ ] **Step 9: 커밋**

```bash
git add src/components/dashboard/summary-tiles.tsx "src/app/(app)/c/[channelId]/dashboard/page.tsx"
git commit -m "refactor: 대시보드 KPI를 4개 보호 성과 지표로 재구성하고 헤더·작성자 위젯 배선 정리"
```

---

### Task 3: RecentCommentsPreview — "최근 위험 알림" + AI 요약 우선 노출

**Files:**
- Modify: `src/components/dashboard/recent-comments-preview.tsx`

**Interfaces:**
- Consumes: 없음
- Produces: `Row` 타입에 `reason: string | null` 필드 추가. `page.tsx`가 넘기는 `recentComments`는 `getFlaggedComments`가 이미 `comments` 테이블 전체 컬럼을 반환하므로 (`db.select()`, 컬럼 제한 없음) `reason` 필드가 이미 존재한다 — `page.tsx` 추가 수정 불필요, 이 태스크는 이 파일 하나로 완결된다.

- [ ] **Step 1: 파일 전체를 아래로 교체**

```tsx
import { Inbox } from "lucide-react";
import Link from "next/link";

import { RiskBadge } from "@/components/dashboard/risk-badge";

type Row = {
  id: string;
  text: string;
  reason: string | null;
  riskLevel: string | null;
  category: string | null;
  createdAt: Date;
};

function formatDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
}

export function RecentCommentsPreview({
  rows,
  channelId,
}: {
  rows: Row[];
  channelId: string;
}) {
  return (
    <div className="rounded-2xl bg-card px-5 py-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-card-foreground">
          최근 위험 알림
        </p>
        <Link
          href={`/c/${channelId}/comments`}
          className="text-xs text-primary underline underline-offset-2"
        >
          전체 보기 →
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <Inbox className="size-6 text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">
            아직 플래그된 댓글이 없습니다.
          </p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {rows.map((row) => (
            <div key={row.id} className="flex items-center gap-3 py-2.5">
              {row.riskLevel && <RiskBadge riskLevel={row.riskLevel} />}
              <p
                className="min-w-0 flex-1 truncate text-[13px] text-card-foreground"
                title={row.reason ?? row.text}
              >
                {row.reason ?? row.text}
              </p>
              <span className="shrink-0 text-xs text-muted-foreground">
                {row.category ?? "미분류"}
              </span>
              <span className="shrink-0 font-mono text-xs text-muted-foreground">
                {formatDate(row.createdAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

원문(`row.text`)은 AI 요약(`reason`)이 없을 때만 폴백으로 쓰인다 — 원문을 완전히 지우는 게 아니라 "AI 요약 우선 노출" 규칙(스펙 12번, "AI 요약 → 위험 유형 → 원문 보기" 순서)을 따른 것이다.

- [ ] **Step 2: 빌드 확인**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add src/components/dashboard/recent-comments-preview.tsx
git commit -m "refactor: 최근 위험 댓글 미리보기를 원문 대신 AI 요약 우선 노출로 전환"
```

---

### Task 4: 위젯 타이틀 카피 통일 (배치)

**Files:**
- Modify: `src/components/dashboard/plan-usage-card.tsx`
- Modify: `src/components/dashboard/repeat-author-notifications-card.tsx`

**Interfaces:**
- Consumes: 없음
- Produces: 없음 (텍스트만 변경, props/타입 변화 없음)

이 두 변경은 각각 한 줄짜리 문자열 교체이고 서로 무관한 파일이라 하나의 태스크로 묶는다.

- [ ] **Step 1: `plan-usage-card.tsx`의 타이틀 텍스트 교체**

`src/components/dashboard/plan-usage-card.tsx`에서:
```tsx
        <p className="text-sm font-medium text-card-foreground">
          이번 달 사용량 · {planLabel} 플랜
        </p>
```
를 아래로 교체:
```tsx
        <p className="text-sm font-medium text-card-foreground">
          채널 사용량
        </p>
```
(`planLabel` 함수 파라미터 자체는 그대로 둔다 — 호출부(`page.tsx`)가 여전히 이 prop을 넘기므로, 구조분해에서 제거하면 미사용 변수 lint 에러 없이도 다른 쪽에서 여전히 넘겨주는 값과 시그니처가 안 맞게 될 뿐이니 그냥 남겨두는 편이 안전하다.)

- [ ] **Step 2: `repeat-author-notifications-card.tsx`의 타이틀 텍스트 교체**

`src/components/dashboard/repeat-author-notifications-card.tsx`에서:
```tsx
      <p className="text-sm font-medium text-card-foreground">
        구독 제안
      </p>
```
를 아래로 교체:
```tsx
      <p className="text-sm font-medium text-card-foreground">
        집중 모니터링 제안
      </p>
```

- [ ] **Step 3: 빌드 확인**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add src/components/dashboard/plan-usage-card.tsx src/components/dashboard/repeat-author-notifications-card.tsx
git commit -m "docs: 대시보드 위젯 타이틀을 스펙 카피로 통일 (채널 사용량, 집중 모니터링 제안)"
```

---

### Task 5: 검증 (코드 리뷰 기준, 자동 로그인 없음)

**Files:** 없음 (검증 전용 태스크)

- [ ] **Step 1: 전체 빌드 확인**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음

- [ ] **Step 2: 스펙 대조 체크리스트로 diff 재확인**

`docs/superpowers/specs/2026-09-15-reevely-ui-redesign.md`의 "04. 대시보드" 섹션 표(변경 전→변경 후 카피)와 Task 1~4의 실제 diff를 한 줄씩 대조한다. 특히:
- KPI 4개 라벨이 정확히 "총 댓글 / 검토 필요 / 악성 비율 / 보호된 댓글"인지
- 최근 위험 알림에서 원문 대신 `reason`이 우선 노출되는지
- "구독 제안"·"이번 달 사용량 · {플랜} 플랜" 문구가 전부 새 카피로 바뀌었는지
- 작성자 위젯이 정확히 하나만 남았는지

- [ ] **Step 3: 사용자에게 수동 확인 요청**

이 태스크는 자동 브라우저 검증을 하지 않는다(로그인 필요 화면, 사용자 확정 사항). 대신 보고서에 "대시보드는 `/c/[channelId]/dashboard`에서 로그인 후 직접 확인해주세요"라는 안내를 남긴다.

- [ ] **Step 4: 문제 발견 시 해당 태스크로 돌아가 수정 (컨트롤러가 직접 고치지 않음)**
