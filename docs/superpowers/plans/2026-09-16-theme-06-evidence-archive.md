# Reevely 증거 보관함 화면 리디자인 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 증거 보관함(`/c/[channelId]/evidence-archive`) 화면을 PPT 스펙대로 재구성한다 — 카드에 플랫폼 아이콘·AI 요약·영상 링크를 추가하고, 액션 버튼을 미리보기/PDF 저장(비활성화)/삭제 3개로 정리하며, 빈 화면에 CTA 버튼을 추가한다. **PDF 실제 생성 기능은 이번 범위에서 만들지 않는다** — 버튼과 디자인만 준비한다(사용자 확정).

**Architecture:** 서버 컴포넌트(`evidence-archive/page.tsx`)는 그대로 `getArchivedComments`로 데이터를 가져오고, 새 클라이언트 컴포넌트(`EvidenceArchiveList`)가 카드 렌더링과 "미리보기" 펼침 상태를 관리한다 — 검토 필요 화면(theme-05)의 `ReviewQueueList`와 동일한 구조.

**Tech Stack:** Next.js App Router (Server + Client Components), Drizzle ORM, Tailwind CSS v4, TypeScript.

**Spec:** `docs/superpowers/specs/2026-09-15-reevely-ui-redesign.md`의 "07. 증거 보관함 (PPT p.8)" 섹션.

## Global Constraints

- **PDF 저장 버튼은 비활성화 상태로 "준비 중" 표시만 한다** (사용자 확정, 2026-09-16) — 실제 PDF 생성 로직은 만들지 않는다. CLAUDE.md의 "만들지 않는 것" 목록에 "증거 PDF 생성"이 명시되어 있는 것과 일치.
- **"미리보기" 버튼은 카드를 그 자리에서 펼쳐서 원문 전체를 노출한다** (사용자 확정, 2026-09-16) — 검토 필요 화면(theme-05)의 "상세" 버튼과 동일한 원리.
- **"삭제" 버튼은 기존 "보관 해제"(증거 보관함에서만 빼는 것, DB의 `isArchived=false` 처리)와 동일한 동작이다** (사용자 확정, 2026-09-16) — 댓글 자체를 영구 삭제하는 게 아니다. 기존 `ArchiveActionButton`을 그대로 재사용하되, 이 화면에서만 라벨을 "삭제"로 표시한다.
- **빈 화면의 "첫 증거 보관하기" 버튼은 댓글 목록 페이지(`/c/[channelId]/comments`)로 이동한다** (사용자 확정, 2026-09-16) — 이 페이지 자체에는 보관 액션이 없고, 실제 보관은 댓글 목록에서 이루어지기 때문.
- **`ArchiveActionButton`은 다른 화면(댓글 목록의 행 확장)에서도 쓰인다** — 라벨을 이 화면 전용으로 바꾸기 위해 optional `label` prop을 추가하고, prop을 넘기지 않으면 기존 "증거 보관"/"보관 해제" 라벨이 그대로 나오게 한다(댓글 목록 쪽 호출부는 건드리지 않음, 하위 호환).
- 문구표(스펙 07번): "확정된 악성 댓글의 증거를 모아두는 공간입니다."→"악성댓글 원문, 영상 링크, 수집일, AI 판정 기록을 안전하게 보관합니다.", "보관된 증거가 없습니다."→"아직 보관된 증거가 없어요.", "증거 보관함"→"증거 보관함 · PDF 저장 가능".
- 카드에 원문 대신 AI 요약(`reason`) 우선 노출 — 다른 화면들과 동일한 `reason ?? text` 폴백 패턴.
- 플랫폼 아이콘/라벨 헬퍼는 새 파일에 로컬로 새로 정의한다(이 코드베이스의 기존 관례 — 화면마다 작은 헬퍼 중복 허용, `comments-table.tsx`/`review-queue-list.tsx`와 동일).
- 이 저장소에는 자동화 테스트 프레임워크가 없다 — "테스트"는 `npx tsc --noEmit && npm run lint` 통과.
- **증거 보관함도 로그인 필요 화면 — 자동 브라우저 검증 안 함** (사용자 확정, 2026-09-15).
- 커밋 전 `npx tsc --noEmit && npm run lint` 통과 확인, 커밋 메시지 `feat|refactor: 간결한 설명`, `any` 금지, `console.log` 금지, DB 직접 접근 금지 — CLAUDE.md 원칙.

---

## 파일 구조 개요

| 파일 | 변경 여부 | 비고 |
|---|---|---|
| `src/components/comments/archive-action-button.tsx` | 수정 | optional `label` prop 추가 |
| `src/components/comments/evidence-archive-list.tsx` | **신규** | 카드 재설계(플랫폼 아이콘·AI요약·영상링크) + 미리보기 펼침 상태 |
| `src/app/(app)/c/[channelId]/evidence-archive/page.tsx` | 수정 | 헤더 카피, 빈 화면 CTA 버튼, 새 컴포넌트 적용 |

---

### Task 1: `ArchiveActionButton` label prop 확장 + 증거 보관함 카드 컴포넌트 신규 작성

**Files:**
- Modify: `src/components/comments/archive-action-button.tsx`
- Create: `src/components/comments/evidence-archive-list.tsx`

**Interfaces:**
- Consumes: 없음
- Produces: `EvidenceArchiveList({ archived, channelId }: { archived: Row[]; channelId: string })` — Task 2가 소비. `ArchiveActionButton`에 optional `label?: string` prop 추가(기존 호출부는 그대로 컴파일됨).

- [ ] **Step 1: `archive-action-button.tsx`의 Props 타입에 `label` 추가하고 버튼 텍스트에 반영**

```tsx
type Props = {
  commentId: string;
  channelId: string;
  isArchived: boolean;
  label?: string;
};

export function ArchiveActionButton({ commentId, channelId, isArchived, label }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleClick() {
    setIsLoading(true);
    setError(null);

    const res = await fetch(`/api/comments/${commentId}/archive`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId, archived: !isArchived }),
    });

    if (res.ok) {
      router.refresh();
      return;
    }

    const data = await res.json().catch(() => null);
    setError(data?.error ?? "처리에 실패했습니다.");
    setIsLoading(false);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        variant={isArchived ? "secondary" : "outline"}
        onClick={handleClick}
        disabled={isLoading}
      >
        {isLoading ? "처리 중…" : (label ?? (isArchived ? "보관 해제" : "증거 보관"))}
      </Button>
      {error && <p className="max-w-[220px] text-right text-[11px] text-risk-high">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: `src/components/comments/evidence-archive-list.tsx` 생성**

```tsx
"use client";

import { useState } from "react";

import { ArchiveActionButton } from "@/components/comments/archive-action-button";
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

function videoUrl(
  platform: string,
  videoId: string,
  videoType: string | null,
): string | null {
  if (platform !== "youtube") return null;
  return videoType === "shorts"
    ? `https://www.youtube.com/shorts/${videoId}`
    : `https://www.youtube.com/watch?v=${videoId}`;
}

type Row = {
  id: string;
  text: string;
  authorDisplayName: string | null;
  platform: string;
  videoId: string;
  videoTitle: string | null;
  videoType: string | null;
  riskLevel: string | null;
  category: string | null;
  reason: string | null;
  archivedAt: Date | null;
};

export function EvidenceArchiveList({
  archived,
  channelId,
}: {
  archived: Row[];
  channelId: string;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      {archived.map((comment) => {
        const isExpanded = expandedId === comment.id;
        const link = videoUrl(comment.platform, comment.videoId, comment.videoType);

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
                  <PlatformIcon platform={comment.platform} />
                  {comment.category && (
                    <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                      {comment.category}
                    </span>
                  )}
                  {comment.archivedAt && (
                    <span className="ml-auto font-mono text-xs text-muted-foreground">
                      보관일 {formatDate(comment.archivedAt)}
                    </span>
                  )}
                </div>

                <p className="text-sm text-card-foreground">
                  {comment.reason ?? comment.text}
                </p>

                <p className="text-xs text-muted-foreground">
                  작성자: {comment.authorDisplayName ?? "알 수 없음"}
                  {" · "}
                  {link ? (
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline underline-offset-2"
                    >
                      {comment.videoTitle ?? "영상 보기"}
                    </a>
                  ) : (
                    (comment.videoTitle ?? comment.videoId)
                  )}
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setExpandedId(isExpanded ? null : comment.id)}
                >
                  미리보기
                </Button>
                <Button size="sm" variant="outline" disabled>
                  PDF 저장 (준비 중)
                </Button>
                <ArchiveActionButton
                  commentId={comment.id}
                  channelId={channelId}
                  isArchived
                  label="삭제"
                />
              </div>
            </div>

            {isExpanded && (
              <div className="rounded-lg border border-border bg-background/50 px-5 py-4">
                <p className="text-sm leading-relaxed text-card-foreground">
                  &ldquo;{comment.text}&rdquo;
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
git add src/components/comments/archive-action-button.tsx src/components/comments/evidence-archive-list.tsx
git commit -m "feat: 증거 보관함 카드 컴포넌트 재설계 및 보관 버튼 라벨 커스터마이즈 지원"
```

---

### Task 2: 증거 보관함 페이지에 새 카드 컴포넌트 적용 + 헤더 카피·빈 화면 CTA 추가

**Files:**
- Modify: `src/app/(app)/c/[channelId]/evidence-archive/page.tsx`

**Interfaces:**
- Consumes: Task 1의 `EvidenceArchiveList({ archived, channelId })`
- Produces: 없음

- [ ] **Step 1: `evidence-archive/page.tsx` 전체를 아래로 교체**

```tsx
import Link from "next/link";
import { Archive } from "lucide-react";

import { EvidenceArchiveList } from "@/components/comments/evidence-archive-list";
import { buttonVariants } from "@/components/ui/button";
import { requireChannelOwnership } from "@/lib/auth/require-channel-ownership";
import { getArchivedComments } from "@/lib/db/queries/comments";

export default async function EvidenceArchivePage({
  params,
}: {
  params: Promise<{ channelId: string }>;
}) {
  const { channelId } = await params;
  await requireChannelOwnership(channelId);
  const archived = await getArchivedComments(channelId);

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8 sm:px-10">
      <header>
        <p className="text-xl font-semibold tracking-tight text-foreground">
          증거 보관함 · PDF 저장 가능
        </p>
        <p className="text-xs text-muted-foreground">
          악성댓글 원문, 영상 링크, 수집일, AI 판정 기록을 안전하게 보관합니다.
        </p>
      </header>

      {archived.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-card px-6 py-16 text-center">
          <Archive className="size-8 text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">
            아직 보관된 증거가 없어요.
          </p>
          <Link
            href={`/c/${channelId}/comments`}
            className={buttonVariants({ size: "sm" })}
          >
            첫 증거 보관하기
          </Link>
        </div>
      ) : (
        <EvidenceArchiveList archived={archived} channelId={channelId} />
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
git add "src/app/(app)/c/[channelId]/evidence-archive/page.tsx"
git commit -m "feat: 증거 보관함 페이지에 재설계된 카드와 빈 화면 CTA 적용"
```

---

### Task 3: 검증 (코드 리뷰 기준, 자동 로그인 없음)

**Files:** 없음 (검증 전용 태스크)

- [ ] **Step 1: 전체 빌드 확인**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음

- [ ] **Step 2: 스펙 대조 체크리스트**

`docs/superpowers/specs/2026-09-15-reevely-ui-redesign.md`의 "07. 증거 보관함" 섹션과 대조:
- 카드에 플랫폼 아이콘, AI 요약(`reason`), 위험도·유형, 작성자, 영상명/링크, 보관일이 모두 노출되는지
- 액션 버튼 3개(미리보기/PDF 저장(비활성화)/삭제)가 정확한 라벨로 있는지, "미리보기" 클릭 시 카드가 펼쳐져 원문이 노출되는지
- "삭제" 버튼이 실제로는 기존 보관 해제(unarchive) API를 그대로 호출하는지(댓글을 영구 삭제하지 않음)
- 빈 화면에 "아직 보관된 증거가 없어요." 문구와 "첫 증거 보관하기" 버튼(댓글 목록으로 이동)이 있는지
- 헤더가 "증거 보관함 · PDF 저장 가능"으로 바뀌었는지

- [ ] **Step 3: 사용자에게 수동 확인 요청**

보고서에 "증거 보관함 화면은 `/c/[channelId]/evidence-archive`에서 로그인 후 직접 확인해주세요 — 특히 PDF 저장 버튼이 비활성화 상태로 보이는지, '삭제' 클릭 시 목록에서 정상적으로 빠지는지(실제로는 보관 해제이므로 댓글 자체는 삭제되지 않음) 확인 필요"라는 안내를 남긴다.

- [ ] **Step 4: 문제 발견 시 해당 태스크로 돌아가 수정**
