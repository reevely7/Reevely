# Reevely 검토 필요 화면 리디자인 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 검토 필요(`/c/[channelId]/review`) 화면의 카드 구조를 PPT 스펙대로 재구성한다 — 1행(위험도+AI 신뢰도+날짜)/2행(AI 요약)/3행(카테고리 태그+플랫폼 아이콘)/우측(악성으로 분류/정상 댓글로 분류/상세) 순서로 정리하고, 원문은 "상세" 클릭 시에만 펼쳐서 노출한다. 공통 디자인 시스템(theme-01)·대시보드(theme-02)·댓글 목록(theme-03)·알림(theme-04)은 이미 반영 완료.

**Architecture:** 서버 컴포넌트(`review/page.tsx`)는 그대로 `getReviewQueue`로 데이터를 가져오고, 새 클라이언트 컴포넌트(`ReviewQueueList`)가 카드 렌더링과 "상세" 펼침 상태를 관리한다 — 댓글 목록(`comments-table.tsx`)의 행 확장 패턴과 동일한 원리이나, 이 화면은 표가 아니라 카드 목록이라 별도 컴포넌트로 분리한다.

**Tech Stack:** Next.js App Router (Server + Client Components), Drizzle ORM, Tailwind CSS v4, TypeScript.

**Spec:** `docs/superpowers/specs/2026-09-15-reevely-ui-redesign.md`의 "06. 검토 필요 화면 (PPT p.7)" 섹션.

## Global Constraints

- **3행 "근거/태그+플랫폼" 구성** (사용자 확정, 2026-09-16): 실제 데이터에는 "근거"라는 별도 필드가 없다(`reason`이 곧 근거 설명, 2행에서 이미 노출). 1행에 있던 유형(`category`) 배지를 3행으로 옮기고, 3행 = 카테고리 태그(pill) + 플랫폼 아이콘으로 구성한다. 1행은 위험도 배지 + AI 신뢰도 + 날짜만 남긴다.
- **"상세" 액션의 정확한 동작** (사용자 확정, 2026-09-16): 카드를 펼쳐서(행 확장) 댓글 원문(`text`) 전체를 노출한다 — 별도 페이지 이동이 아니다. 댓글 목록(theme-03)의 "상세보기=행 확장" 패턴과 동일한 원리.
- **버튼 문구·색상 통일** (스펙 06/12번): "악성 맞음"→"악성으로 분류"(Danger/`destructive` variant, 스펙 12번 "Danger는 '악성으로 분류'처럼 위험 액션에만 제한적으로 사용" 규칙 적용), "아님"→"정상 댓글로 분류"(outline 유지). `confidence 0.60`→"AI 신뢰도 60%"(`Math.round(Number(confidence) * 100)`, 댓글 목록의 `InfoTile` "AI 확신도" 표시와 동일 계산식).
- 헤더 설명 카피 변경: "AI가 확실하지 못한 댓글입니다. 직접 확인해서 확정해 주세요." → "AI 확신도가 낮은 댓글만 모아 직접 판단할 수 있습니다."
- `Button`의 `destructive` variant는 이미 `src/components/ui/button.tsx`에 존재하고 다른 화면(관리자 패널, 계정 삭제)에서 이미 쓰이는 기존 토큰이다 — 새 색상 추가 아님. `StatusActionButton`의 `variant` prop 타입에만 `"destructive"`를 추가하면 된다.
- 플랫폼 아이콘·라벨 헬퍼(`PLATFORM_ICONS`/`PLATFORM_LABELS`/`PlatformIcon`)는 `comments-table.tsx`에 이미 동일한 형태로 존재하지만 그 파일 안에 로컬로만 정의되어 있어(export 안 됨) 가져다 쓸 수 없다 — 이 코드베이스는 `Notification` 타입처럼 화면마다 작은 헬퍼를 로컬로 중복 정의하는 것이 기존 관례이므로, 새 파일에도 동일한 작은 헬퍼를 로컬로 새로 정의한다(공용 모듈로 추출하지 않음).
- 이 저장소에는 자동화 테스트 프레임워크가 없다 — "테스트"는 `npx tsc --noEmit && npm run lint` 통과. 매 커밋마다 프로젝트 전체가 빌드되는 상태를 유지한다.
- **검토 필요 화면도 로그인 필요 화면 — 자동 브라우저 검증 안 함** (사용자 확정, 2026-09-15). 검증 태스크는 코드 대조 + 사용자 수동 확인 안내로 대체한다.
- 커밋 전 `npx tsc --noEmit && npm run lint` 통과 확인, 커밋 메시지 `feat|refactor: 간결한 설명`, `any` 금지, `console.log` 금지, DB 직접 접근 금지 (전부 `src/lib/db/queries/` 경유) — CLAUDE.md 원칙.

---

## 파일 구조 개요

| 파일 | 변경 여부 | 비고 |
|---|---|---|
| `src/components/comments/status-action-button.tsx` | 수정 | `variant` prop 타입에 `"destructive"` 추가 |
| `src/components/comments/review-queue-list.tsx` | **신규** | 카드 재설계 + 상세 펼침 상태 관리 + 로컬 플랫폼 아이콘 헬퍼 |
| `src/app/(app)/c/[channelId]/review/page.tsx` | 수정 | 헤더 카피 변경, 인라인 카드 JSX를 `ReviewQueueList`로 교체 |

---

### Task 1: `StatusActionButton` destructive variant 허용 + 카드 리스트 컴포넌트 신규 작성

**Files:**
- Modify: `src/components/comments/status-action-button.tsx`
- Create: `src/components/comments/review-queue-list.tsx`

**Interfaces:**
- Consumes: 없음
- Produces: `ReviewQueueList({ queue, channelId }: { queue: Row[]; channelId: string })` — Task 2가 소비. `Row` 타입은 `id`, `text`, `authorDisplayName`, `platform`, `riskLevel`, `category`, `confidence`, `reason`, `createdAt` 필드를 가진다(모두 `getReviewQueue`가 이미 반환하는 `comments` 테이블 컬럼의 부분집합 — 추가 쿼리 변경 불필요).

이 태스크는 기존 `StatusActionButton`의 `variant` prop 타입을 넓히는 것뿐이라(기존 호출부는 전부 그대로 컴파일됨) 별도 호출부 수정이 필요 없다.

- [ ] **Step 1: `status-action-button.tsx`의 `variant` prop 타입에 `"destructive"` 추가**

```ts
type Props = {
  commentId: string;
  channelId: string;
  status: Status;
  label: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive";
};
```

- [ ] **Step 2: `src/components/comments/review-queue-list.tsx` 생성**

```tsx
"use client";

import { useState } from "react";

import { StatusActionButton } from "@/components/comments/status-action-button";
import { RiskBadge } from "@/components/dashboard/risk-badge";
import { InstagramIcon } from "@/components/icons/instagram-icon";
import { YoutubeIcon } from "@/components/icons/youtube-icon";
import { Button } from "@/components/ui/button";

const PLATFORM_LABELS: Record<string, string> = {
  youtube: "유튜브",
  instagram: "인스타그램",
};

const PLATFORM_ICONS: Record<string, typeof YoutubeIcon> = {
  youtube: YoutubeIcon,
  instagram: InstagramIcon,
};

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

function formatDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
}

type Row = {
  id: string;
  text: string;
  authorDisplayName: string | null;
  platform: string;
  riskLevel: string | null;
  category: string | null;
  confidence: string | null;
  reason: string | null;
  createdAt: Date;
};

export function ReviewQueueList({
  queue,
  channelId,
}: {
  queue: Row[];
  channelId: string;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      {queue.map((comment) => {
        const isExpanded = expandedId === comment.id;

        return (
          <div
            key={comment.id}
            className="flex flex-col gap-3 rounded-2xl bg-card px-5 py-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  {comment.riskLevel && (
                    <RiskBadge riskLevel={comment.riskLevel} />
                  )}
                  {comment.confidence && (
                    <span className="font-mono text-xs text-muted-foreground">
                      AI 신뢰도 {Math.round(Number(comment.confidence) * 100)}%
                    </span>
                  )}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {formatDate(comment.createdAt)}
                  </span>
                </div>

                <p className="text-sm text-card-foreground">
                  {comment.reason ?? comment.text}
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  {comment.category && (
                    <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                      {comment.category}
                    </span>
                  )}
                  <PlatformIcon platform={comment.platform} />
                </div>
              </div>

              <div className="flex shrink-0 gap-2">
                <StatusActionButton
                  commentId={comment.id}
                  channelId={channelId}
                  status="confirmed"
                  label="악성으로 분류"
                  variant="destructive"
                />
                <StatusActionButton
                  commentId={comment.id}
                  channelId={channelId}
                  status="whitelisted"
                  label="정상 댓글로 분류"
                  variant="outline"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setExpandedId(isExpanded ? null : comment.id)}
                >
                  상세
                </Button>
              </div>
            </div>

            {isExpanded && (
              <div className="rounded-lg border border-border bg-background/50 px-5 py-4">
                <p className="text-sm leading-relaxed text-card-foreground">
                  &ldquo;{comment.text}&rdquo;
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  작성자: {comment.authorDisplayName ?? "알 수 없음"}
                </p>
              </div>
            )}
          </div>
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
git add src/components/comments/status-action-button.tsx src/components/comments/review-queue-list.tsx
git commit -m "feat: 검토 필요 화면용 카드 리스트 컴포넌트와 destructive 액션 버튼 추가"
```

---

### Task 2: 검토 필요 페이지에 새 카드 컴포넌트 적용 + 헤더 카피 변경

**Files:**
- Modify: `src/app/(app)/c/[channelId]/review/page.tsx`

**Interfaces:**
- Consumes: Task 1의 `ReviewQueueList({ queue, channelId })`
- Produces: 없음

- [ ] **Step 1: `review/page.tsx` 전체를 아래로 교체**

```tsx
import { CheckCircle2 } from "lucide-react";

import { ReviewQueueList } from "@/components/comments/review-queue-list";
import { requireChannelOwnership } from "@/lib/auth/require-channel-ownership";
import { getReviewQueue } from "@/lib/db/queries/comments";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ channelId: string }>;
}) {
  const { channelId } = await params;
  await requireChannelOwnership(channelId);
  const queue = await getReviewQueue(channelId);

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8 sm:px-10">
      <header>
        <p className="text-xl font-semibold tracking-tight text-foreground">
          검토 필요
        </p>
        <p className="text-xs text-muted-foreground">
          AI 확신도가 낮은 댓글만 모아 직접 판단할 수 있습니다.
        </p>
      </header>

      {queue.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-card px-6 py-16 text-center">
          <CheckCircle2 className="size-8 text-risk-low" aria-hidden />
          <p className="text-sm text-muted-foreground">
            검토할 댓글이 없습니다.
          </p>
        </div>
      ) : (
        <ReviewQueueList queue={queue} channelId={channelId} />
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
git add "src/app/(app)/c/[channelId]/review/page.tsx"
git commit -m "feat: 검토 필요 페이지에 재설계된 카드 컴포넌트 적용"
```

---

### Task 3: 검증 (코드 리뷰 기준, 자동 로그인 없음)

**Files:** 없음 (검증 전용 태스크)

- [ ] **Step 1: 전체 빌드 확인**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음

- [ ] **Step 2: 스펙 대조 체크리스트**

`docs/superpowers/specs/2026-09-15-reevely-ui-redesign.md`의 "06. 검토 필요 화면" 섹션과 대조:
- 카드 1행: 위험도 배지 + AI 신뢰도(%) + 날짜
- 카드 2행: AI 요약(`reason`, 없으면 원문 폴백)
- 카드 3행: 카테고리 태그 + 플랫폼 아이콘
- 우측 액션: "악성으로 분류"(destructive/빨간색) / "정상 댓글로 분류"(outline) / "상세"
- "상세" 클릭 시 카드가 펼쳐지며 원문 전체 노출
- 헤더 설명이 "AI 확신도가 낮은 댓글만 모아 직접 판단할 수 있습니다."로 변경됨
- 빈 큐 상태("검토할 댓글이 없습니다.")는 기존 그대로 유지되는지

- [ ] **Step 3: 사용자에게 수동 확인 요청**

보고서에 "검토 필요 화면은 `/c/[channelId]/review`에서 로그인 후 직접 확인해주세요 — 특히 '악성으로 분류' 버튼이 빨간색(destructive)으로 보이는지, '상세' 클릭 시 카드가 정상적으로 펼쳐지는지 확인 필요"라는 안내를 남긴다.

- [ ] **Step 4: 문제 발견 시 해당 태스크로 돌아가 수정**
