# Reevely 댓글 목록 화면 리디자인 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 댓글 목록(`/c/[channelId]/comments`)을 "원문을 읽는 표"에서 "AI가 분류한 결과를 빠르게 확인하고 관리하는 표"로 전환한다 — 체크박스 일괄 처리, 플랫폼 아이콘, 원문 숨김 토글, 통합된 상태값(정상/검토 필요/검토 완료 + 보호됨 배지)을 추가한다. 공통 디자인 시스템(theme-01)과 대시보드(theme-02)는 이미 반영 완료.

**Architecture:** 서버 컴포넌트(`comments/page.tsx`)가 필터를 쿼리 파라미터로 받아 `getFlaggedComments`로 목록을 가져오고, 클라이언트 컴포넌트(`CommentsTable`)가 행 확장·체크박스 선택·원문 숨김 토글 같은 상호작용 상태를 관리한다. 일괄 처리는 새 벌크 API 라우트 2개(`/api/comments/bulk-status`, `/api/comments/bulk-archive`) + 새 DB 쿼리 함수 2개로 구현하며, 기존 단건 처리 라우트(`/api/comments/[id]/status`, `/api/comments/[id]/archive`)의 패턴을 그대로 따른다.

**Tech Stack:** Next.js App Router (Server + Client Components), Drizzle ORM, Zod, Supabase Auth, Tailwind CSS v4, TypeScript, lucide-react.

**Spec:** `docs/superpowers/specs/2026-09-15-reevely-ui-redesign.md`의 "05. 댓글 목록 (PPT p.6)" 섹션 + "스코프 결정 사항" 하단의 2026-09-16 확정 4가지 항목.

## Global Constraints

- **상태값 매핑** (사용자 확정): `confirmed`→**검토 완료**(그린, 기존 `status-confirmed` 토큰 재사용), `needs_review`→**검토 필요**(옐로우, 기존 토큰), `reported_false`·`whitelisted`→둘 다 **정상**(그레이, 기존 `bg-muted`). `isArchived=true`면 상태 라벨과 **별개로** "보호됨" 배지를 추가 표시한다 (상태 라벨을 대체하지 않음 — 한 댓글이 "검토 완료"+"보호됨"을 동시에 가질 수 있음).
- **일괄 처리는 실제로 동작해야 한다** (사용자 확정) — UI만 있고 동작 안 하는 자리표시자는 안 됨. 새 벌크 API 라우트를 만든다.
- **플랫폼 아이콘은 유튜브·인스타그램만** (사용자 확정) — DB `platformEnum`에 틱톡이 없으므로 틱톡 아이콘은 추가하지 않는다.
- **원문 숨김 토글의 정확한 의미**: 목록 행의 미리보기 텍스트가 `reason`(AI 요약, ON일 때·기본값) 또는 `text`(원문, OFF일 때) 중 무엇을 보여줄지를 토글한다. 행을 클릭해 펼치는 상세보기(기존 확장 UI)는 이미 "원문 보기" 단계 역할을 하므로 건드리지 않는다 — 토글은 목록 미리보기 레벨에서만 작동한다.
- **기존 단건 액션 버튼의 동작·조건은 바꾸지 않는다** — `reported_false` 상태로 바꾸는 버튼은 원래 `row.status === "reported_false"`일 때만 숨기던 조건 그대로 유지하고, 라벨 텍스트만 "오탐 신고"→"정상 댓글로 분류"로 바꾼다. 새로운 "악성으로 분류" 버튼을 댓글 목록에 추가하지 않는다 (그건 검토 필요 화면의 역할, 이번 플랜 범위 아님).
- 컬러/버튼/배지는 이미 토큰화되어 있음 — 하드코딩 hex 추가 금지. "보호됨" 배지는 `bg-primary/10 text-primary` (기존 브랜드 그린 토큰의 투명도 변형, 신규 CSS 변수 아님)를 쓴다.
- 이 저장소에는 자동화 테스트 프레임워크가 없다 — "테스트"는 `npx tsc --noEmit && npm run lint` 통과. 매 커밋마다 프로젝트 전체가 빌드되는 상태를 유지한다.
- **댓글 목록도 로그인 필요 화면 — 자동 브라우저 검증 안 함** (사용자 확정, 2026-09-15). 검증 태스크는 코드 대조 + 사용자 수동 확인 안내로 대체한다.
- 커밋 전 `npx tsc --noEmit && npm run lint` 통과 확인, 커밋 메시지 `feat|refactor: 간결한 설명`, `any` 금지, `console.log` 금지, DB 직접 접근 금지 (전부 `src/lib/db/queries/` 경유) — CLAUDE.md 원칙

---

## 파일 구조 개요

| 파일 | 변경 여부 | 비고 |
|---|---|---|
| `src/components/icons/youtube-icon.tsx` | **신규** | 유튜브 브랜드 아이콘 (lucide-react에 없어서 커스텀 SVG, 기존 `bell-icon.tsx` 패턴 따름) |
| `src/components/icons/instagram-icon.tsx` | **신규** | 인스타그램 브랜드 아이콘 (동일 패턴) |
| `src/lib/db/queries/comments.ts` | 수정 | `CommentFilters`에 `platform` 필드 추가, `buildFlaggedConditions`에 플랫폼 조건 추가, `updateCommentStatusBulk`/`archiveCommentsBulk` 함수 추가 |
| `src/app/api/comments/bulk-status/route.ts` | **신규** | 일괄 상태 변경 API |
| `src/app/api/comments/bulk-archive/route.ts` | **신규** | 일괄 증거 보관 API (플랜 한도 체크 포함) |
| `src/components/comments/bulk-action-bar.tsx` | **신규** | 선택된 댓글에 대한 일괄 조치 액션바 |
| `src/components/dashboard/comments-table.tsx` | **구조 변경** | 체크박스 컬럼, 플랫폼 아이콘 컬럼, 상태 라벨 통합+보호됨 배지, 원문숨김 토글, BulkActionBar 연결 |
| `src/components/dashboard/comment-filters.tsx` | 수정 | 플랫폼 필터 추가, 상태 필터 라벨을 새 매핑으로 갱신(정상/검토필요/검토완료 3종, whitelisted 제외) |
| `src/app/(app)/c/[channelId]/comments/page.tsx` | 수정 | `platform` searchParam 전달, 헤더 카피 변경 |

---

### Task 1: 플랫폼 아이콘 컴포넌트 추가

**Files:**
- Create: `src/components/icons/youtube-icon.tsx`
- Create: `src/components/icons/instagram-icon.tsx`

**Interfaces:**
- Consumes: 없음
- Produces: `YoutubeIcon({ className }: { className?: string })`, `InstagramIcon({ className }: { className?: string })` — Task 4가 `PlatformIcon`에서 소비.

- [ ] **Step 1: `src/components/icons/youtube-icon.tsx` 생성**

```tsx
export function YoutubeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
      <path d="m10 15 5-3-5-3z" fill="currentColor" stroke="none" />
    </svg>
  );
}
```

- [ ] **Step 2: `src/components/icons/instagram-icon.tsx` 생성**

```tsx
export function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}
```

- [ ] **Step 3: 빌드 확인**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add src/components/icons/youtube-icon.tsx src/components/icons/instagram-icon.tsx
git commit -m "feat: 유튜브·인스타그램 플랫폼 아이콘 컴포넌트 추가"
```

---

### Task 2: DB 레이어 — 플랫폼 필터 + 일괄 처리 쿼리 함수 추가

**Files:**
- Modify: `src/lib/db/queries/comments.ts`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `CommentFilters.platform?: "youtube" | "instagram"` — Task 5가 소비
  - `updateCommentStatusBulk(commentIds: string[], channelId: string, status: CommentStatus): Promise<number>` — Task 3이 소비
  - `archiveCommentsBulk(commentIds: string[], channelId: string): Promise<number>` — Task 3이 소비

- [ ] **Step 1: `CommentFilters` 타입에 `platform` 필드 추가**

```ts
export type CommentFilters = {
  riskLevel?: CommentRiskLevel;
  category?: string;
  status?: "confirmed" | "needs_review" | "reported_false" | "whitelisted";
  platform?: "youtube" | "instagram";
  videoId?: string;
  search?: string;
  author?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: "newest" | "risk";
};
```

- [ ] **Step 2: `buildFlaggedConditions`에 플랫폼 조건 추가**

`if (filters.category) conditions.push(eq(comments.category, filters.category));` 바로 다음 줄에 추가:

```ts
  if (filters.platform) conditions.push(eq(comments.platform, filters.platform));
```

- [ ] **Step 3: `updateCommentStatus` 함수 바로 아래에 일괄 버전 추가**

```ts
export async function updateCommentStatusBulk(
  commentIds: string[],
  channelId: string,
  status: CommentStatus,
) {
  if (commentIds.length === 0) return 0;

  const updated = await db
    .update(comments)
    .set({ status, isHumanReviewed: true })
    .where(
      and(inArray(comments.id, commentIds), eq(comments.channelId, channelId)),
    )
    .returning({ id: comments.id });

  return updated.length;
}
```

`inArray`는 파일 상단에 이미 import되어 있다 (`import { ..., inArray, ... } from "drizzle-orm"`) — 추가 import 불필요.

- [ ] **Step 4: `archiveComment`/`unarchiveComment` 함수 바로 아래에 일괄 보관 버전 추가**

```ts
export async function archiveCommentsBulk(
  commentIds: string[],
  channelId: string,
) {
  if (commentIds.length === 0) return 0;

  const updated = await db
    .update(comments)
    .set({ isArchived: true, archivedAt: new Date() })
    .where(
      and(inArray(comments.id, commentIds), eq(comments.channelId, channelId)),
    )
    .returning({ id: comments.id });

  return updated.length;
}
```

- [ ] **Step 5: 빌드 확인**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음 (기존 호출부는 전부 옵션 필드 추가라 영향 없음)

- [ ] **Step 6: 커밋**

```bash
git add src/lib/db/queries/comments.ts
git commit -m "feat: 댓글 플랫폼 필터와 일괄 상태변경·보관 쿼리 함수 추가"
```

---

### Task 3: 일괄 처리 API 라우트 추가

**Files:**
- Create: `src/app/api/comments/bulk-status/route.ts`
- Create: `src/app/api/comments/bulk-archive/route.ts`

**Interfaces:**
- Consumes: Task 2의 `updateCommentStatusBulk`, `archiveCommentsBulk`
- Produces: `PATCH /api/comments/bulk-status` (body: `{ channelId, commentIds, status }`), `PATCH /api/comments/bulk-archive` (body: `{ channelId, commentIds }`) — Task 4의 `BulkActionBar`가 `fetch`로 호출

두 라우트는 기존 `src/app/api/comments/[id]/status/route.ts`·`archive/route.ts`와 인증·권한 체크 패턴이 동일하다 (그 두 파일을 참고해서 스타일을 맞출 것).

- [ ] **Step 1: `src/app/api/comments/bulk-status/route.ts` 생성**

```ts
import { NextResponse } from "next/server";
import { z } from "zod";

import { getChannelById } from "@/lib/db/queries/channels";
import { updateCommentStatusBulk } from "@/lib/db/queries/comments";
import { createClient } from "@/lib/supabase/server";

const BodySchema = z.object({
  channelId: z.string(),
  commentIds: z.array(z.string()).min(1).max(100),
  status: z.enum(["confirmed", "reported_false", "whitelisted"]),
});

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = BodySchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const channel = await getChannelById(body.data.channelId);
  if (!channel || channel.userId !== user.id) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const updatedCount = await updateCommentStatusBulk(
    body.data.commentIds,
    body.data.channelId,
    body.data.status,
  );

  return NextResponse.json({ ok: true, updatedCount });
}
```

- [ ] **Step 2: `src/app/api/comments/bulk-archive/route.ts` 생성**

```ts
import { NextResponse } from "next/server";
import { z } from "zod";

import { getChannelById } from "@/lib/db/queries/channels";
import {
  archiveCommentsBulk,
  countArchivedCommentsByUserId,
} from "@/lib/db/queries/comments";
import { getEvidenceArchiveLimitForUser } from "@/lib/db/queries/subscriptions";
import { createClient } from "@/lib/supabase/server";

const BodySchema = z.object({
  channelId: z.string(),
  commentIds: z.array(z.string()).min(1).max(100),
});

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = BodySchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const channel = await getChannelById(body.data.channelId);
  if (!channel || channel.userId !== user.id) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const [limit, currentCount] = await Promise.all([
    getEvidenceArchiveLimitForUser(user.id),
    countArchivedCommentsByUserId(user.id),
  ]);

  if (limit !== null && currentCount + body.data.commentIds.length > limit) {
    return NextResponse.json(
      {
        error:
          limit === 0
            ? "증거 보관함은 유료 플랜에서 이용할 수 있습니다. 플랜을 업그레이드해 주세요."
            : `증거 보관함 한도(${limit}건)를 초과합니다. 남은 자리: ${Math.max(0, limit - currentCount)}건`,
      },
      { status: 403 },
    );
  }

  const updatedCount = await archiveCommentsBulk(
    body.data.commentIds,
    body.data.channelId,
  );

  return NextResponse.json({ ok: true, updatedCount });
}
```

- [ ] **Step 3: 빌드 확인**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add src/app/api/comments/bulk-status/route.ts src/app/api/comments/bulk-archive/route.ts
git commit -m "feat: 댓글 일괄 상태변경·증거보관 API 라우트 추가"
```

---

### Task 4: CommentsTable 재구성 — 체크박스, 플랫폼 아이콘, 상태 통합, 원문숨김 토글

**Files:**
- Create: `src/components/comments/bulk-action-bar.tsx`
- Modify: `src/components/dashboard/comments-table.tsx`

**Interfaces:**
- Consumes: Task 1의 `YoutubeIcon`/`InstagramIcon`, Task 3의 `/api/comments/bulk-status`·`/api/comments/bulk-archive` (런타임 `fetch` 호출, import 아님)
- Produces: 없음 (최상위 클라이언트 컴포넌트)

두 파일을 함께 한 커밋으로 묶는다 — `CommentsTable`이 새로 만드는 `BulkActionBar`를 import하므로, 따로 커밋하면 `BulkActionBar`가 없는 상태에서 `CommentsTable`만 있는 중간 커밋이 빌드에 실패한다.

- [ ] **Step 1: `src/components/comments/bulk-action-bar.tsx` 생성**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function BulkActionBar({
  channelId,
  selectedIds,
  onClear,
}: {
  channelId: string;
  selectedIds: string[];
  onClear: () => void;
}) {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (selectedIds.length === 0) return null;

  async function runBulkStatus(status: "reported_false") {
    setIsLoading(status);
    setError(null);
    const res = await fetch("/api/comments/bulk-status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId, commentIds: selectedIds, status }),
    });
    if (res.ok) {
      onClear();
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "처리에 실패했습니다.");
    }
    setIsLoading(null);
  }

  async function runBulkArchive() {
    setIsLoading("archive");
    setError(null);
    const res = await fetch("/api/comments/bulk-archive", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId, commentIds: selectedIds }),
    });
    if (res.ok) {
      onClear();
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "처리에 실패했습니다.");
    }
    setIsLoading(null);
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-accent px-4 py-3">
      <p className="text-sm font-medium text-accent-foreground">
        {selectedIds.length}건 선택됨
      </p>
      {error && <p className="text-xs text-risk-high">{error}</p>}
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => runBulkStatus("reported_false")}
          disabled={isLoading !== null}
        >
          {isLoading === "reported_false" ? "처리 중…" : "정상 댓글로 분류"}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={runBulkArchive}
          disabled={isLoading !== null}
        >
          {isLoading === "archive" ? "처리 중…" : "증거 보관"}
        </Button>
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          선택 해제
        </button>
      </div>
    </div>
  );
}
```

(일괄 조치는 "정상 댓글로 분류"와 "증거 보관" 두 가지만 제공한다 — "악성으로 분류"는 이 화면에 원래 없던 액션이라 추가하지 않는다, Global Constraints 참고.)

- [ ] **Step 2: `src/components/dashboard/comments-table.tsx` 파일 전체를 아래로 교체**

```tsx
"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight, Inbox, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { ArchiveActionButton } from "@/components/comments/archive-action-button";
import { BulkActionBar } from "@/components/comments/bulk-action-bar";
import { StatusActionButton } from "@/components/comments/status-action-button";
import { Button } from "@/components/ui/button";
import { RiskBadge } from "@/components/dashboard/risk-badge";
import { InstagramIcon } from "@/components/icons/instagram-icon";
import { YoutubeIcon } from "@/components/icons/youtube-icon";

type Row = {
  id: string;
  text: string;
  authorDisplayName: string | null;
  authorChannelId: string;
  platform: string;
  videoTitle: string | null;
  videoType: string | null;
  riskLevel: string | null;
  category: string | null;
  confidence: string | null;
  reason: string | null;
  status: string;
  videoId: string;
  youtubeCommentId: string;
  createdAt: Date;
  isArchived: boolean;
};

const PLATFORM_LABELS: Record<string, string> = {
  youtube: "유튜브",
  instagram: "인스타그램",
};

const PLATFORM_ICONS: Record<string, typeof YoutubeIcon> = {
  youtube: YoutubeIcon,
  instagram: InstagramIcon,
};

const VIDEO_TYPE_LABELS: Record<string, string> = {
  video: "동영상",
  shorts: "쇼츠",
};

function formatDetectedAt(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
}

// confirmed=검토 완료(그린), needs_review=검토 필요(옐로우), reported_false·whitelisted는
// 둘 다 "정상"(그레이)으로 통합 표시한다. isArchived는 이 상태와 별개 축이라 배지를
// 하나 더 붙인다("검토 완료"+"보호됨"을 동시에 가질 수 있음) — ProtectedBadge 참고.
const STATUS_LABELS: Record<string, string> = {
  confirmed: "검토 완료",
  needs_review: "검토 필요",
  reported_false: "정상",
  whitelisted: "정상",
};

const STATUS_PILL_CLASSES: Record<string, string> = {
  confirmed: "bg-status-confirmed-bg text-status-confirmed",
  needs_review: "bg-status-needs-review-bg text-status-needs-review",
  reported_false: "bg-muted text-muted-foreground",
  whitelisted: "bg-muted text-muted-foreground",
};

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_PILL_CLASSES[status] ?? "bg-muted text-muted-foreground"}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function ProtectedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
      <ShieldCheck className="size-3" aria-hidden />
      보호됨
    </span>
  );
}

function PlatformIcon({ platform }: { platform: string }) {
  const Icon = PLATFORM_ICONS[platform];
  if (!Icon) return null;
  return (
    <span
      className="inline-flex items-center text-muted-foreground"
      title={PLATFORM_LABELS[platform] ?? platform}
    >
      <Icon className="size-4" />
    </span>
  );
}

function InfoTile({
  label,
  value,
  href,
  internalHref,
  span,
}: {
  label: string;
  value: string;
  href?: string;
  internalHref?: string;
  span?: string;
}) {
  const linkClassName =
    "block truncate text-[13px] font-medium text-primary underline underline-offset-2";

  return (
    <div
      className={`rounded-lg border border-border bg-background/50 px-3 py-2 ${span ?? ""}`}
    >
      <p className="text-[10px] tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      {internalHref ? (
        <Link href={internalHref} className={linkClassName} title={value}>
          {value}
        </Link>
      ) : href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClassName}
          title={value}
        >
          {value}
        </a>
      ) : (
        <p
          className="truncate text-[13px] font-medium text-card-foreground"
          title={value}
        >
          {value}
        </p>
      )}
    </div>
  );
}

export function CommentsTable({
  rows,
  channelId,
}: {
  rows: Row[];
  channelId: string;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [hideOriginal, setHideOriginal] = useState(true);

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) =>
      prev.size === rows.length
        ? new Set()
        : new Set(rows.map((row) => row.id)),
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl bg-card px-6 py-16 text-center">
        <Inbox className="size-8 text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">
          조건에 맞는 댓글이 없습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BulkActionBar
          channelId={channelId}
          selectedIds={Array.from(selectedIds)}
          onClear={() => setSelectedIds(new Set())}
        />
        <Button
          size="sm"
          variant={hideOriginal ? "default" : "outline"}
          onClick={() => setHideOriginal((v) => !v)}
        >
          원문 숨김 {hideOriginal ? "ON" : "OFF"}
        </Button>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-card">
        <table className="w-full min-w-[820px] border-collapse text-left text-[13px]">
          <thead>
            <tr className="border-b border-border text-[11px] text-muted-foreground">
              <th className="w-8 px-4 py-3 font-medium">
                <input
                  type="checkbox"
                  checked={selectedIds.size === rows.length}
                  onChange={toggleSelectAll}
                  aria-label="전체 선택"
                  className="size-3.5 accent-primary"
                />
              </th>
              <th className="w-8 px-2 py-3 font-medium" />
              <th className="px-2 py-3 font-medium">위험도</th>
              <th className="w-8 px-2 py-3 font-medium">플랫폼</th>
              <th className="px-2 py-3 font-medium">댓글 내용 또는 AI 요약</th>
              <th className="max-w-[8rem] px-2 py-3 font-medium">작성자</th>
              <th className="px-2 py-3 font-medium whitespace-nowrap">유형</th>
              <th className="px-2 py-3 font-medium whitespace-nowrap">날짜</th>
              <th className="px-2 py-3 font-medium whitespace-nowrap">상태</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isExpanded = expandedId === row.id;
              const isSelected = selectedIds.has(row.id);
              const previewText = hideOriginal
                ? (row.reason ?? row.text)
                : row.text;

              return (
                <Fragment key={row.id}>
                  <tr
                    onClick={() => setExpandedId(isExpanded ? null : row.id)}
                    className={`cursor-pointer border-b border-border border-l-2 last:border-0 ${isExpanded ? "border-l-primary bg-highlight/10" : "border-l-transparent hover:bg-accent/50"}`}
                  >
                    <td
                      className="px-4 py-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelected(row.id)}
                        aria-label="댓글 선택"
                        className="size-3.5 accent-primary"
                      />
                    </td>
                    <td className="px-2 py-3 text-muted-foreground">
                      {isExpanded ? (
                        <ChevronDown className="size-3.5" aria-hidden />
                      ) : (
                        <ChevronRight className="size-3.5" aria-hidden />
                      )}
                    </td>
                    <td className="px-2 py-3">
                      {row.riskLevel && <RiskBadge riskLevel={row.riskLevel} />}
                    </td>
                    <td className="px-2 py-3">
                      <PlatformIcon platform={row.platform} />
                    </td>
                    <td
                      className="max-w-md truncate px-2 py-3 text-card-foreground"
                      title={previewText}
                    >
                      {previewText}
                    </td>
                    <td
                      className="max-w-[8rem] truncate px-2 py-3 text-muted-foreground"
                      title={row.authorDisplayName ?? "알 수 없음"}
                    >
                      {row.authorDisplayName ?? "알 수 없음"}
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-muted-foreground">
                      {row.category ?? "미분류"}
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-muted-foreground">
                      {formatDate(row.createdAt)}
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap">
                      <div className="flex flex-wrap items-center gap-1">
                        <StatusPill status={row.status} />
                        {row.isArchived && <ProtectedBadge />}
                      </div>
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr className="border-b border-border bg-background/40 last:border-0">
                      <td colSpan={9} className="px-4 py-4">
                        <div className="flex flex-col gap-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-2">
                              {row.riskLevel && (
                                <RiskBadge riskLevel={row.riskLevel} />
                              )}
                              <StatusPill status={row.status} />
                              {row.isArchived && <ProtectedBadge />}
                              <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                                {row.category ?? "미분류"}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              {row.status === "reported_false" ? (
                                <span className="text-[11px] text-muted-foreground">
                                  정상 댓글로 분류됨
                                </span>
                              ) : (
                                <StatusActionButton
                                  commentId={row.id}
                                  channelId={channelId}
                                  status="reported_false"
                                  label="정상 댓글로 분류"
                                />
                              )}
                              <ArchiveActionButton
                                commentId={row.id}
                                channelId={channelId}
                                isArchived={row.isArchived}
                              />
                            </div>
                          </div>

                          <div className="rounded-lg border border-border bg-background/50 px-5 py-4">
                            <p className="text-sm leading-relaxed text-card-foreground">
                              “{row.text}”
                            </p>
                            {row.reason && (
                              <p className="mt-2 text-[13px] text-muted-foreground">
                                <span className="text-primary/80">
                                  AI 판정 근거·
                                </span>
                                {row.reason}
                              </p>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {row.platform === "youtube" && row.videoTitle && (
                              <InfoTile
                                label="영상 제목"
                                value={row.videoTitle}
                                href={
                                  row.videoType === "shorts"
                                    ? `https://www.youtube.com/shorts/${row.videoId}`
                                    : `https://www.youtube.com/watch?v=${row.videoId}`
                                }
                                span="col-span-2"
                              />
                            )}
                            <InfoTile
                              label="댓글"
                              value="댓글로 이동"
                              href={`https://www.youtube.com/watch?v=${row.videoId}&lc=${row.youtubeCommentId}`}
                            />
                            <InfoTile
                              label="작성자"
                              value={row.authorDisplayName ?? "알 수 없음"}
                              internalHref={`/c/${channelId}/authors/${encodeURIComponent(row.authorChannelId)}`}
                            />
                            <InfoTile
                              label="플랫폼"
                              value={PLATFORM_LABELS[row.platform] ?? row.platform}
                            />
                            {row.platform === "youtube" && row.videoType && (
                              <InfoTile
                                label="콘텐츠 형식"
                                value={
                                  VIDEO_TYPE_LABELS[row.videoType] ??
                                  row.videoType
                                }
                              />
                            )}
                            <InfoTile
                              label="탐지 시각"
                              value={formatDetectedAt(row.createdAt)}
                            />
                            <InfoTile
                              label="AI 확신도"
                              value={
                                row.confidence
                                  ? `${Math.round(Number(row.confidence) * 100)}%`
                                  : "-"
                              }
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

주요 변경점 요약 (구현자용 체크리스트):
- 체크박스 컬럼(전체선택 헤더 + 행별) 추가, 클릭 시 행 확장(`onClick`)과 충돌하지 않도록 `stopPropagation` 처리
- 플랫폼 아이콘 컬럼 추가
- 메인 행 미리보기 텍스트: `hideOriginal`이 true면 `row.reason ?? row.text`, false면 `row.text`
- 상태 라벨/색상 통합: `STATUS_LABELS`/`STATUS_PILL_CLASSES`를 확정/검토필요/오탐신고됨/화이트리스트에서 검토완료/검토필요/정상(2개 키 공유)으로 교체
- `isArchived`일 때 상태 pill 옆에 `ProtectedBadge`("보호됨") 추가 표시 (메인 행 + 확장 상세 양쪽)
- 기존 단건 액션 버튼은 조건(`row.status === "reported_false"`일 때만 숨김)과 `status="reported_false"` 그대로, 라벨만 "오탐 신고"→"정상 댓글로 분류"
- 확장 상세의 `colSpan`을 7→9로 조정 (컬럼 2개 늘어남)
- 원문 인용부호는 기존과 동일하게 유니코드 곡선따옴표(“ ”)를 그대로 쓴다 — ASCII `"`가 아니므로 lint 규칙과 무관, 바꾸지 않는다

- [ ] **Step 3: 빌드 확인**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add src/components/comments/bulk-action-bar.tsx src/components/dashboard/comments-table.tsx
git commit -m "refactor: 댓글 목록에 체크박스 일괄처리·플랫폼 아이콘·원문숨김 토글·통합 상태값 추가"
```

---

### Task 5: 필터·헤더 카피 갱신

**Files:**
- Modify: `src/components/dashboard/comment-filters.tsx`
- Modify: `src/app/(app)/c/[channelId]/comments/page.tsx`

**Interfaces:**
- Consumes: Task 2의 `CommentFilters.platform` 필드
- Produces: 없음

- [ ] **Step 1: `comment-filters.tsx`의 `STATUS_LABELS`를 필터용 3종으로 교체**

```ts
const STATUS_LABELS: Record<string, string> = {
  confirmed: "검토 완료",
  needs_review: "검토 필요",
  reported_false: "정상",
};
```

(`whitelisted`는 필터 옵션에서 제외한다 — 이 목록은 `isMalicious=true`인 댓글만 보여주는데 `whitelisted`는 AI가 처음부터 정상으로 판단한 댓글에만 붙는 상태라 이 목록에 나타날 수 없다. 필터로 노출하면 항상 0건만 나오는 죽은 옵션이 된다.)

- [ ] **Step 2: 플랫폼 필터 추가**

`상태 전체` `FilterSelect` 블록 바로 다음에 추가:

```tsx
        <FilterSelect
          value={searchParams.get("platform") ?? ""}
          onValueChange={(value) => updateParam("platform", value)}
          options={[
            { value: "", label: "플랫폼 전체" },
            { value: "youtube", label: "유튜브" },
            { value: "instagram", label: "인스타그램" },
          ]}
        />
```

`hasActiveFilters` 계산의 `Boolean(...)` 안에도 `searchParams.get("platform") ||`를 추가한다 (기존 `searchParams.get("status") ||` 다음 줄).

- [ ] **Step 3: `comments/page.tsx`의 searchParams 타입과 filters 객체에 `platform` 추가**

```tsx
  searchParams: Promise<{
    risk?: string;
    category?: string;
    status?: string;
    platform?: string;
    video?: string;
    search?: string;
    author?: string;
    dateFrom?: string;
    dateTo?: string;
    sort?: string;
    page?: string;
  }>;
```

```tsx
  const filters: CommentFiltersType = {
    riskLevel: sp.risk as CommentFiltersType["riskLevel"],
    category: sp.category,
    status: sp.status as CommentFiltersType["status"],
    platform: sp.platform as CommentFiltersType["platform"],
    videoId: sp.video,
    search: sp.search,
    author: sp.author,
    dateFrom: sp.dateFrom,
    dateTo: sp.dateTo,
    sort: sp.sort as CommentFiltersType["sort"],
  };
```

- [ ] **Step 4: 헤더 설명 카피 변경**

```tsx
          <p className="text-xs text-muted-foreground">
            위험도별로 플래그된 댓글입니다.
          </p>
```
를 아래로 교체:
```tsx
          <p className="text-xs text-muted-foreground">
            AI가 분류한 댓글을 한눈에 확인하고 관리합니다.
          </p>
```

- [ ] **Step 5: 빌드 확인**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음

- [ ] **Step 6: 커밋**

```bash
git add src/components/dashboard/comment-filters.tsx "src/app/(app)/c/[channelId]/comments/page.tsx"
git commit -m "feat: 댓글 목록에 플랫폼 필터 추가하고 헤더·상태 필터 카피 갱신"
```

---

### Task 6: 검증 (코드 리뷰 기준, 자동 로그인 없음)

**Files:** 없음 (검증 전용 태스크)

- [ ] **Step 1: 전체 빌드 확인**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음

- [ ] **Step 2: 스펙 대조 체크리스트**

`docs/superpowers/specs/2026-09-15-reevely-ui-redesign.md`의 "05. 댓글 목록" 섹션과 대조:
- 상단 "원문 숨김 ON" 토글 존재, 기본값 ON
- 플랫폼 아이콘 컬럼 존재 (유튜브/인스타그램만)
- 긴 댓글은 표에서 말줄임(truncate), 상세보기(행 확장)에서만 원문 전체 노출
- 체크박스 선택 → 일괄 조치(정상 댓글로 분류/증거 보관) 실제 동작
- 상태: 정상/검토 필요/검토 완료 + 보호됨 배지 별도 표시
- 필터: 위험도·유형·상태·플랫폼·날짜 전부 존재

- [ ] **Step 3: 벌크 API 라우트 보안 체크**

`bulk-status`/`bulk-archive` 라우트가 단건 라우트와 동일하게: 로그인 체크 → 채널 소유권 체크(`channel.userId !== user.id`) → 그 다음에만 DB 쓰기, 순서로 되어 있는지 diff에서 확인.

- [ ] **Step 4: 사용자에게 수동 확인 요청**

보고서에 "댓글 목록은 `/c/[channelId]/comments`에서 로그인 후 직접 확인해주세요 — 특히 체크박스 선택 후 일괄 처리 버튼이 실제로 동작하는지, 원문 숨김 토글이 잘 전환되는지 확인 필요"라는 안내를 남긴다.

- [ ] **Step 5: 문제 발견 시 해당 태스크로 돌아가 수정**
