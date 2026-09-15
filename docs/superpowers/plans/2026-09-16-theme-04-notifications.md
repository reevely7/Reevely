# Reevely 알림 화면 리디자인 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 알림(`/c/[channelId]/notifications`)을 "댓글 원문을 보여주는 화면"에서 "중요한 상황 변화를 빠르게 알리는 화면"으로 전환한다 — 탭(전체/위험 알림/반복 작성자/공지사항), 알림 문구의 위험도·카테고리 breakdown, AI 요약(`reason`) 우선 노출을 추가한다. 공통 디자인 시스템(theme-01)·대시보드(theme-02)·댓글 목록(theme-03)은 이미 반영 완료.

**Architecture:** 서버 컴포넌트(`notifications/page.tsx`)가 `tab` 쿼리 파라미터를 읽어 `getNotifications`에 타입 필터를 넘기고, 클라이언트 컴포넌트(`NotificationTabs`)가 탭 클릭 시 URL을 갱신한다(댓글 목록의 `CommentFilters`와 동일한 패턴). 알림 생성 로직(`src/lib/db/queries/notifications.ts`, cron 파이프라인 `analyze-pending-comments.ts`)은 기존 함수 시그니처를 확장해 위험도·카테고리 breakdown을 메시지에 포함시킨다.

**Tech Stack:** Next.js App Router (Server + Client Components), Drizzle ORM, Zod, Supabase Auth, Tailwind CSS v4, TypeScript.

**Spec:** `docs/superpowers/specs/2026-09-15-reevely-ui-redesign.md`의 "08. 알림 화면 (PPT p.9)" 섹션 + "12. 액션 버튼·상태값 통일"의 관련 문구.

## Global Constraints

- **탭-타입 매핑** (사용자 확정, 2026-09-16): 전체=필터 없음, **위험 알림**=`new_comment`+`video_spike`+`review_backlog`, **반복 작성자**=`repeat_author`, **공지사항**=`weekly_digest`+`reauth_required`. 계정 단위 알림(`payment_failed`/`payment_downgraded`/`analysis_quota_reached`, `channelId` null)은 이 페이지 범위 밖 — 지금처럼 `/mypage/subscription`에서만 노출하고 이 페이지·탭에는 포함하지 않는다.
- **알림 문구는 위험도·카테고리별 집계까지 확장한다** (사용자 확정, 2026-09-16): `video_spike`는 위험도별 건수(High/Medium/Low)를, `repeat_author`는 카테고리별 건수(협박/인신공격 등)를 메시지에 포함한다. 새 DB 집계가 필요한 쪽(`repeat_author`)은 새 쿼리 함수를 추가하고, 이미 배치 안에서 알 수 있는 쪽(`video_spike`)은 기존 cron 파이프라인의 집계 로직만 확장한다(새 쿼리 불필요).
- **`new_comment` 알림은 원문 대신 AI 요약(`reason`)을 우선 노출한다** (사용자 확정, 2026-09-16): 대시보드(`recent-comments-preview.tsx`)와 동일한 `reason ?? text` 폴백 패턴. 원문을 완전히 지우는 게 아니라 AI 요약이 없을 때만 폴백으로 원문을 쓴다.
- **"전체 알림 보기/상세 분석 보기" 문구는 "전체 알림 보기"만 유지한다** — 스펙의 "또는" 표기이고, "상세 분석 보기"가 가리키는 별도 상세 분석 페이지는 이번 12단계 어디에도 정의되어 있지 않다. 새 페이지를 만들지 않는다(스코프 확대 방지).
- 위험도 배지의 영문 라벨(`High`/`Medium`/`Low`, `risk-badge.tsx`)과 Secondary 버튼 테두리색은 손대지 않는다 — theme-01 플랜에서 11단계(전체 화면 재점검)로 명시적으로 미뤄둔 항목.
- 컬러/버튼/배지는 이미 토큰화되어 있음 — 하드코딩 hex 추가 금지. 새 탭 버튼의 active 스타일은 `bg-primary text-primary-foreground`(기존 토큰)를 쓴다.
- **인터페이스가 바뀌는 파일과 그 호출부는 반드시 한 커밋으로 묶는다** (CLAUDE.md 원칙) — `getNotifications`/`maybeNotifyVideoSpike` 시그니처 변경은 그 호출부 수정과 같은 태스크·같은 커밋에서 함께 처리한다. 태스크 사이에 빌드가 깨지는 중간 상태를 만들지 않는다.
- 이 저장소에는 자동화 테스트 프레임워크가 없다 — "테스트"는 `npx tsc --noEmit && npm run lint` 통과. 매 커밋마다 프로젝트 전체가 빌드되는 상태를 유지한다.
- **알림 화면도 로그인 필요 화면 — 자동 브라우저 검증 안 함** (사용자 확정, 2026-09-15). 검증 태스크는 코드 대조 + 사용자 수동 확인 안내로 대체한다.
- 커밋 전 `npx tsc --noEmit && npm run lint` 통과 확인, 커밋 메시지 `feat|refactor: 간결한 설명`, `any` 금지, `console.log` 금지, DB 직접 접근 금지 (전부 `src/lib/db/queries/` 경유) — CLAUDE.md 원칙.

---

## 파일 구조 개요

| 파일 | 변경 여부 | 비고 |
|---|---|---|
| `src/lib/db/queries/comments.ts` | 수정 | `getCategoryBreakdownByAuthor` 함수 추가 |
| `src/lib/db/queries/notifications.ts` | 수정 | `NotificationType` export, `getNotifications` 타입 필터+`reason` 필드 추가, `countNotificationsByType` 신규, `repeat_author`/`video_spike`/`review_backlog` 문구 개편 |
| `src/lib/ai/analyze-pending-comments.ts` | 수정 | 영상별 위험도 breakdown 집계 후 `maybeNotifyVideoSpike`에 전달 |
| `src/app/(app)/c/[channelId]/layout.tsx` | 수정 | `getNotifications` 호출부 새 시그니처로 갱신 |
| `src/app/(app)/c/[channelId]/dashboard/page.tsx` | 수정 | 동일 |
| `src/lib/notifications/tabs.ts` | **신규** | 탭 키·라벨·타입 매핑 상수 (서버 페이지·클라이언트 탭 컴포넌트 공용) |
| `src/components/notifications/notification-tabs.tsx` | **신규** | 탭 UI (URL `tab` 쿼리 파라미터 기반) |
| `src/app/(app)/c/[channelId]/notifications/page.tsx` | 수정 | 탭 적용, 헤더 카피 변경 |
| `src/components/notifications/notification-row.tsx` | 수정 | `reason` 필드 추가, 원문 대신 AI 요약 우선 노출 |
| `src/components/dashboard/notification-bell.tsx` | 수정 | 동일 |

---

### Task 1: DB 레이어 — 반복 작성자 카테고리 breakdown 쿼리 추가

**Files:**
- Modify: `src/lib/db/queries/comments.ts`

**Interfaces:**
- Consumes: 없음
- Produces: `getCategoryBreakdownByAuthor(channelId: string, authorChannelId: string): Promise<Array<{ category: string; count: number }>>` (건수 내림차순 정렬) — Task 3이 소비

- [ ] **Step 1: `desc`를 drizzle-orm import에 추가**

파일 상단의 import를 아래로 교체:

```ts
import {
  and,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lt,
  sql,
  type SQL,
} from "drizzle-orm";
```

- [ ] **Step 2: `countMaliciousCommentsByAuthor` 함수 바로 아래에 breakdown 함수 추가**

```ts
// 반복 위험 작성자 알림의 유형 breakdown용 — 해당 작성자의 악성 댓글을
// 카테고리별로 집계한다. isMalicious=true인 댓글만 대상이라 category는
// 항상 "해당없음"이 아닌 실제 유형(협박/인신공격 등)이다.
export async function getCategoryBreakdownByAuthor(
  channelId: string,
  authorChannelId: string,
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
        eq(comments.authorChannelId, authorChannelId),
        eq(comments.isMalicious, true),
      ),
    )
    .groupBy(comments.category)
    .orderBy(desc(sql`count(*)`));

  return rows.filter(
    (row): row is { category: string; count: number } => row.category !== null,
  );
}
```

- [ ] **Step 3: 빌드 확인**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add src/lib/db/queries/comments.ts
git commit -m "feat: 작성자별 악성 댓글 카테고리 breakdown 쿼리 추가"
```

---

### Task 2: 알림 조회 쿼리 확장 (탭 필터·AI 요약 필드) + 호출부 동시 갱신

**Files:**
- Modify: `src/lib/db/queries/notifications.ts`
- Modify: `src/app/(app)/c/[channelId]/layout.tsx`
- Modify: `src/app/(app)/c/[channelId]/dashboard/page.tsx`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `export type NotificationType` (기존 로컬 타입을 export로 전환) — Task 4의 `tabs.ts`가 소비
  - `getNotifications(channelId: string, options?: { limit?: number; types?: NotificationType[] }): Promise<...>` — Task 5가 소비
  - `countNotificationsByType(channelId: string): Promise<Partial<Record<NotificationType, number>>>` — Task 5가 소비
  - 반환 행에 `reason: string | null` 필드 추가 — Task 6이 소비

이 태스크는 시그니처가 바뀌는 함수와 그 호출부를 한 커밋에 묶는다 — 중간에 빌드가 깨지는 상태를 만들지 않기 위함(Global Constraints 참고).

- [ ] **Step 1: `inArray`를 drizzle-orm import에 추가**

`src/lib/db/queries/notifications.ts` 파일 상단 import를 아래로 교체:

```ts
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
```

- [ ] **Step 2: 로컬 `NotificationType` 타입을 export로 전환**

```ts
export type NotificationType =
  | "new_comment"
  | "repeat_author"
  | "review_backlog"
  | "video_spike"
  | "weekly_digest"
  | "payment_failed"
  | "payment_downgraded"
  | "analysis_quota_reached"
  | "reauth_required";
```

- [ ] **Step 3: `getNotifications` 함수를 아래로 교체**

```ts
export async function getNotifications(
  channelId: string,
  options?: { limit?: number; types?: NotificationType[] },
) {
  const conditions = [eq(notifications.channelId, channelId)];
  if (options?.types) {
    conditions.push(inArray(notifications.type, options.types));
  }

  const query = db
    .select({
      id: notifications.id,
      type: notifications.type,
      isRead: notifications.isRead,
      createdAt: notifications.createdAt,
      title: notifications.title,
      message: notifications.message,
      href: notifications.href,
      commentText: comments.text,
      reason: comments.reason,
      riskLevel: comments.riskLevel,
      category: comments.category,
      authorDisplayName: comments.authorDisplayName,
      videoId: comments.videoId,
      videoTitle: comments.videoTitle,
    })
    .from(notifications)
    .leftJoin(comments, eq(notifications.commentId, comments.id))
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt));

  return options?.limit ? query.limit(options.limit) : query;
}
```

- [ ] **Step 4: `countUnreadNotifications` 함수 바로 아래에 탭 카운트 함수 추가**

```ts
// 알림 탭(전체/위험 알림/반복 작성자/공지사항)별 배지 숫자용 — 타입별 전체 건수.
export async function countNotificationsByType(channelId: string) {
  const rows = await db
    .select({ type: notifications.type, count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(eq(notifications.channelId, channelId))
    .groupBy(notifications.type);

  return Object.fromEntries(rows.map((row) => [row.type, row.count])) as Partial<
    Record<NotificationType, number>
  >;
}
```

- [ ] **Step 5: `layout.tsx`의 `getNotifications` 호출부를 새 시그니처로 수정**

`getNotifications(channelId, RECENT_NOTIFICATIONS_LIMIT),` 를 아래로 교체:

```ts
    getNotifications(channelId, { limit: RECENT_NOTIFICATIONS_LIMIT }),
```

- [ ] **Step 6: `dashboard/page.tsx`의 `getNotifications` 호출부를 새 시그니처로 수정**

`getNotifications(channelId, 30),` 를 아래로 교체:

```ts
    getNotifications(channelId, { limit: 30 }),
```

- [ ] **Step 7: 빌드 확인**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음

- [ ] **Step 8: 커밋**

```bash
git add src/lib/db/queries/notifications.ts "src/app/(app)/c/[channelId]/layout.tsx" "src/app/(app)/c/[channelId]/dashboard/page.tsx"
git commit -m "feat: 알림 조회에 타입 필터·AI 요약 필드·타입별 카운트 추가"
```

---

### Task 3: 알림 생성 로직 — 위험도·카테고리 breakdown 반영 + 문구 통일

**Files:**
- Modify: `src/lib/db/queries/notifications.ts`
- Modify: `src/lib/ai/analyze-pending-comments.ts`

**Interfaces:**
- Consumes: Task 1의 `getCategoryBreakdownByAuthor`
- Produces: 없음 (이 태스크에서 시그니처 변경과 호출부 갱신을 함께 완료)

`maybeNotifyVideoSpike`의 시그니처가 바뀌므로 그 유일한 호출부(`analyze-pending-comments.ts`)도 같은 태스크·같은 커밋에서 함께 고친다.

- [ ] **Step 1: `comments.ts`의 새 함수를 import 목록에 추가**

`src/lib/db/queries/notifications.ts` 상단 import를 아래로 교체:

```ts
import {
  countMaliciousCommentsByAuthor,
  countMaliciousCommentsInRange,
  getCategoryBreakdownByAuthor,
} from "@/lib/db/queries/comments";
```

- [ ] **Step 2: `repeatAuthorMessage` 함수를 카테고리 breakdown을 받도록 교체**

```ts
function formatCategoryBreakdown(
  breakdown: Array<{ category: string; count: number }>,
): string {
  return breakdown
    .slice(0, 2)
    .map((row) => `${row.category} ${row.count}건`)
    .join("·");
}

function repeatAuthorMessage(
  authorDisplayName: string | null,
  threshold: number,
  categoryBreakdown: string,
): string {
  const name = authorDisplayName ?? "이 작성자";
  const suffix = categoryBreakdown ? ` (${categoryBreakdown})` : "";
  if (threshold >= 30) {
    return `${name}님이 누적 ${threshold}번째 악성 댓글을 남겼어요${suffix}. 매우 심각한 수준으로 반복되고 있습니다.`;
  }
  if (threshold >= 10) {
    return `${name}님이 누적 ${threshold}번째 악성 댓글을 남겼어요${suffix}. 반복적으로 문제를 일으키고 있습니다.`;
  }
  return `${name}님이 벌써 ${threshold}번째 악성 댓글을 남겼어요${suffix}. 알림을 받아볼까요?`;
}
```

- [ ] **Step 3: `maybeSuggestAuthorSubscription`에서 breakdown을 조회해 메시지·타이틀에 반영**

`for (const threshold of REPEAT_AUTHOR_THRESHOLDS) { ... }` 블록 내부를 아래로 교체:

```ts
  for (const threshold of REPEAT_AUTHOR_THRESHOLDS) {
    if (count < threshold) break; // 오름차순이라 여기서 못 넘으면 그 위 단계도 못 넘은 것

    const refId = repeatAuthorRefId(authorChannelId, threshold);
    if (await hasEverNotifiedOfType(channelId, "repeat_author", refId)) continue;

    const breakdown = await getCategoryBreakdownByAuthor(channelId, authorChannelId);

    await db.insert(notifications).values({
      userId,
      channelId,
      type: "repeat_author",
      title: "반복 위험 작성자 발견",
      message: repeatAuthorMessage(
        authorDisplayName,
        threshold,
        formatCategoryBreakdown(breakdown),
      ),
      href: `/c/${channelId}/authors/${encodeURIComponent(authorChannelId)}`,
      refId,
    });
  }
```

- [ ] **Step 4: `maybeNotifyVideoSpike`를 위험도 breakdown을 받도록 교체**

```ts
function formatRiskBreakdown(riskCounts: {
  high: number;
  medium: number;
  low: number;
}): string {
  const parts: string[] = [];
  if (riskCounts.high > 0) parts.push(`High ${riskCounts.high}건`);
  if (riskCounts.medium > 0) parts.push(`Medium ${riskCounts.medium}건`);
  if (riskCounts.low > 0) parts.push(`Low ${riskCounts.low}건`);
  return parts.slice(0, 2).join("·");
}

// 한 번의 분석 배치 안에서 특정 영상에 VIDEO_SPIKE_THRESHOLD건 이상 악성 댓글이
// 몰렸을 때. 같은 영상에 대해 안읽은 알림이 이미 있으면 또 만들지 않는다.
export async function maybeNotifyVideoSpike(
  userId: string,
  channelId: string,
  videoId: string,
  videoTitle: string | null,
  count: number,
  riskCounts: { high: number; medium: number; low: number },
) {
  if (count < VIDEO_SPIKE_THRESHOLD) return;
  if (await hasUnreadNotificationOfType(channelId, "video_spike", videoId)) return;

  await db.insert(notifications).values({
    userId,
    channelId,
    type: "video_spike",
    title: "위험 댓글 급증",
    message: `"${videoTitle ?? videoId}" 영상에서 위험 댓글 ${count}건이 감지됐어요 (${formatRiskBreakdown(riskCounts)}).`,
    href: `/c/${channelId}/dashboard?video=${encodeURIComponent(videoId)}`,
    refId: videoId,
  });
}
```

- [ ] **Step 5: `maybeNotifyReviewBacklog`의 메시지 문구를 스펙 예시에 맞춰 교체**

```ts
  await db.insert(notifications).values({
    userId,
    channelId,
    type: "review_backlog",
    title: "검토 필요 댓글이 쌓이고 있어요",
    message: `AI 확신도가 낮아 사용자 확인이 필요한 댓글이 ${backlogCount}건 있습니다.`,
    href: `/c/${channelId}/review`,
  });
```

- [ ] **Step 6: `analyze-pending-comments.ts`의 `videoMaliciousCounts` 맵 타입에 `riskCounts` 추가**

```ts
  // 이번 배치 안에서 영상별로 몇 건이 악성으로 나왔는지, 위험도별로는 몇 건인지
  // — 배치가 끝난 뒤 영상 저격(video_spike) 알림 여부·문구를 판단하는 데 쓴다.
  const videoMaliciousCounts = new Map<
    string,
    {
      count: number;
      videoTitle: string | null;
      riskCounts: { high: number; medium: number; low: number };
    }
  >();
```

- [ ] **Step 7: 악성 판정 시 `riskCounts` 누적**

```ts
        const entry = videoMaliciousCounts.get(comment.videoId) ?? {
          count: 0,
          videoTitle: comment.videoTitle,
          riskCounts: { high: 0, medium: 0, low: 0 },
        };
        entry.count += 1;
        entry.riskCounts[analysis.risk_level] += 1;
        videoMaliciousCounts.set(comment.videoId, entry);
```

- [ ] **Step 8: `maybeNotifyVideoSpike` 호출부에 `riskCounts` 전달**

```ts
  for (const [videoId, { count, videoTitle, riskCounts }] of videoMaliciousCounts) {
    await maybeNotifyVideoSpike(userId, channelId, videoId, videoTitle, count, riskCounts);
  }
```

- [ ] **Step 9: 빌드 확인**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음

- [ ] **Step 10: 커밋**

```bash
git add src/lib/db/queries/notifications.ts src/lib/ai/analyze-pending-comments.ts
git commit -m "feat: 반복 작성자·영상 급증 알림에 카테고리·위험도 breakdown 반영"
```

---

### Task 4: 알림 탭 상수 + 탭 UI 컴포넌트 신규 작성

**Files:**
- Create: `src/lib/notifications/tabs.ts`
- Create: `src/components/notifications/notification-tabs.tsx`

**Interfaces:**
- Consumes: Task 2의 `export type NotificationType`
- Produces: `NOTIFICATION_TABS: Array<{ key: NotificationTabKey; label: string; types: NotificationType[] | null }>`, `NotificationTabs({ counts }: { counts: Record<string, number> })` — Task 5가 둘 다 소비

이 태스크는 아직 아무 곳에서도 호출되지 않는 새 파일만 추가하므로 빌드에 영향 없음.

- [ ] **Step 1: `src/lib/notifications/tabs.ts` 생성**

```ts
import type { NotificationType } from "@/lib/db/queries/notifications";

export type NotificationTabKey = "all" | "risk" | "repeat" | "notice";

// PPT 스펙(08. 알림 화면)의 4개 탭 — 실제 notificationType 9종 중 채널 단위
// 6종만 여기 매핑된다. 계정 단위 결제/한도 알림(payment_*, analysis_quota_reached)은
// 이 페이지 범위 밖(사용자 확정) — /mypage/subscription에서만 노출한다.
export const NOTIFICATION_TABS: Array<{
  key: NotificationTabKey;
  label: string;
  types: NotificationType[] | null;
}> = [
  { key: "all", label: "전체", types: null },
  {
    key: "risk",
    label: "위험 알림",
    types: ["new_comment", "video_spike", "review_backlog"],
  },
  { key: "repeat", label: "반복 작성자", types: ["repeat_author"] },
  {
    key: "notice",
    label: "공지사항",
    types: ["weekly_digest", "reauth_required"],
  },
];
```

- [ ] **Step 2: `src/components/notifications/notification-tabs.tsx` 생성**

```tsx
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { NOTIFICATION_TABS } from "@/lib/notifications/tabs";

export function NotificationTabs({
  counts,
}: {
  counts: Record<string, number>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") ?? "all";

  function handleClick(tabKey: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (tabKey === "all") {
      params.delete("tab");
    } else {
      params.set("tab", tabKey);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {NOTIFICATION_TABS.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => handleClick(tab.key)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent"
            }`}
          >
            {tab.label} {counts[tab.key] ?? 0}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: 빌드 확인**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add src/lib/notifications/tabs.ts src/components/notifications/notification-tabs.tsx
git commit -m "feat: 알림 탭(전체·위험알림·반복작성자·공지사항) 상수와 UI 컴포넌트 추가"
```

---

### Task 5: 알림 페이지에 탭 적용 + 헤더 카피 변경

**Files:**
- Modify: `src/app/(app)/c/[channelId]/notifications/page.tsx`

**Interfaces:**
- Consumes: Task 2의 `getNotifications(channelId, options)`·`countNotificationsByType`, Task 4의 `NOTIFICATION_TABS`·`NotificationTabs`
- Produces: 없음

- [ ] **Step 1: `notifications/page.tsx` 전체를 아래로 교체**

```tsx
import { BellIcon } from "@/components/icons/bell-icon";
import { MarkAllReadButton } from "@/components/notifications/mark-all-read-button";
import { NotificationRow } from "@/components/notifications/notification-row";
import { NotificationTabs } from "@/components/notifications/notification-tabs";
import { requireChannelOwnership } from "@/lib/auth/require-channel-ownership";
import {
  countNotificationsByType,
  getNotifications,
} from "@/lib/db/queries/notifications";
import { NOTIFICATION_TABS } from "@/lib/notifications/tabs";

export default async function NotificationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ channelId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { channelId } = await params;
  await requireChannelOwnership(channelId);

  const sp = await searchParams;
  const activeTab =
    NOTIFICATION_TABS.find((tab) => tab.key === sp.tab) ?? NOTIFICATION_TABS[0];

  const [notifications, countsByType] = await Promise.all([
    getNotifications(channelId, { types: activeTab.types ?? undefined }),
    countNotificationsByType(channelId),
  ]);
  const hasUnread = notifications.some((n) => !n.isRead);

  const tabCounts = Object.fromEntries(
    NOTIFICATION_TABS.map((tab) => [
      tab.key,
      tab.types
        ? tab.types.reduce((sum, type) => sum + (countsByType[type] ?? 0), 0)
        : Object.values(countsByType).reduce((sum, c) => sum + c, 0),
    ]),
  );

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8 sm:px-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xl font-semibold tracking-tight text-foreground">
            알림
          </p>
          <p className="text-xs text-muted-foreground">
            위험 댓글 증가, 반복 작성자, 검토 필요 등 중요한 변화만 알려드립니다.
          </p>
        </div>
        {hasUnread && <MarkAllReadButton channelId={channelId} />}
      </header>

      <NotificationTabs counts={tabCounts} />

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-card px-6 py-16 text-center">
          <BellIcon className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {activeTab.key === "all"
              ? "아직 알림이 없습니다. 작성자 상세 페이지에서 \"새 댓글 알림 받기\"를 눌러보세요."
              : "이 탭에는 아직 알림이 없어요."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {notifications.map((notification) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
              channelId={channelId}
            />
          ))}
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 2: 빌드 확인**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add "src/app/(app)/c/[channelId]/notifications/page.tsx"
git commit -m "feat: 알림 페이지에 탭 필터 적용하고 헤더 카피 변경"
```

---

### Task 6: 알림 카드 — 원문 대신 AI 요약 우선 노출

**Files:**
- Modify: `src/components/notifications/notification-row.tsx`
- Modify: `src/components/dashboard/notification-bell.tsx`

**Interfaces:**
- Consumes: Task 2에서 `getNotifications`가 반환하는 `reason` 필드
- Produces: 없음

- [ ] **Step 1: `notification-row.tsx`의 `Notification` 타입에 `reason` 필드 추가**

`commentText: string | null;` 바로 아래 줄에 추가:

```ts
  reason: string | null;
```

- [ ] **Step 2: `notification-row.tsx`의 원문 노출 부분을 AI 요약 우선으로 교체**

```tsx
      <p className="line-clamp-2 text-sm text-card-foreground">
        {notification.reason ?? notification.commentText}
      </p>
```

- [ ] **Step 3: `notification-bell.tsx`의 `Notification` 타입에 `reason` 필드 추가**

`commentText: string | null;` 바로 아래 줄에 추가:

```ts
  reason: string | null;
```

- [ ] **Step 4: `notification-bell.tsx`의 원문 노출 부분을 AI 요약 우선으로 교체**

```tsx
                    <span className="line-clamp-1 text-xs text-muted-foreground">
                      {notification.reason ?? notification.commentText}
                    </span>
```

- [ ] **Step 5: 빌드 확인**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음

- [ ] **Step 6: 커밋**

```bash
git add src/components/notifications/notification-row.tsx src/components/dashboard/notification-bell.tsx
git commit -m "refactor: 알림 카드에서 댓글 원문 대신 AI 요약 우선 노출"
```

---

### Task 7: 검증 (코드 리뷰 기준, 자동 로그인 없음)

**Files:** 없음 (검증 전용 태스크)

- [ ] **Step 1: 전체 빌드 확인**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음

- [ ] **Step 2: 스펙 대조 체크리스트**

`docs/superpowers/specs/2026-09-15-reevely-ui-redesign.md`의 "08. 알림 화면" 섹션과 대조:
- 탭: 전체/위험 알림/반복 작성자/공지사항 존재, 각 탭 클릭 시 URL의 `tab` 파라미터가 바뀌고 목록이 필터링됨
- 헤더 설명이 "위험 댓글 증가, 반복 작성자, 검토 필요 등 중요한 변화만 알려드립니다."로 바뀜
- `video_spike` 알림 타이틀이 "위험 댓글 급증", 메시지에 위험도별 건수 포함
- `repeat_author` 알림 타이틀이 "반복 위험 작성자 발견", 메시지에 카테고리별 건수 포함
- `review_backlog` 메시지가 "AI 확신도가 낮아 사용자 확인이 필요한 댓글이 N건 있습니다."
- `new_comment` 카드 미리보기가 원문이 아니라 AI 요약(`reason`) 우선

- [ ] **Step 3: 알림 생성 로직 회귀 확인 (코드 리딩)**

`analyze-pending-comments.ts`에서 `videoMaliciousCounts`의 `riskCounts` 누적이 `analysis.risk_level`("high"/"medium"/"low")과 정확히 매핑되는지, `maybeSuggestAuthorSubscription`의 임계치 루프가 여러 단계를 동시에 넘을 때도 각 단계마다 breakdown이 정상 조회되는지 diff에서 확인.

- [ ] **Step 4: 사용자에게 수동 확인 요청**

보고서에 "알림 화면은 `/c/[channelId]/notifications`에서 로그인 후 직접 확인해주세요 — 특히 탭 전환, 카운트 숫자가 실제 알림 개수와 맞는지 확인 필요. 위험도·카테고리 breakdown이 반영된 새 알림 문구는 다음 cron 분석 배치가 새로 알림을 생성해야 볼 수 있습니다(기존 알림 문구는 소급 갱신되지 않음)"라는 안내를 남긴다.

- [ ] **Step 5: 문제 발견 시 해당 태스크로 돌아가 수정**
