# Reevely 다크 톤 리디자인 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reevely 전 화면(로그인·온보딩·대시보드·검토 큐·설정)을 라이트 기본 크림/네이비 팔레트에서 다크 전용 슬레이트+웜 앰버 팔레트로 전환하고, 테두리 위주 박스 구조를 테두리 없는 floating 카드 구조로 바꾼다.

**Architecture:** 모든 색은 `globals.css`의 CSS 커스텀 프로퍼티(디자인 토큰) 한 곳에서만 정의하고, 컴포넌트는 하드코딩된 hex 대신 그 토큰에 대응하는 Tailwind 유틸리티 클래스(`bg-background`, `bg-card`, `bg-primary`, `text-risk-high` 등)만 사용한다. 라이트모드 자체를 없애므로 `:root` 하나만 남기고 `.dark` 분기와 `next-themes`를 완전히 제거한다.

**Tech Stack:** Next.js App Router, Tailwind CSS v4 (`@theme inline` 토큰), shadcn/ui(Base UI 기반 `Button` 등, 토큰 기반이라 컴포넌트 자체는 수정 불필요), TypeScript.

## Global Constraints

- 커밋 전 `npx tsc --noEmit && npm run lint` 통과 확인 (CLAUDE.md)
- 커밋 메시지: `refactor: 간결한 설명` — 본문에 이유 포함 (CLAUDE.md 규칙상 이번 작업은 기능 추가/버그 수정이 아닌 표현 계층 재구성이므로 `refactor` 사용)
- `any` 타입 금지, 프로덕션 코드에 `console.log` 금지 — 이번 작업은 스타일링/마크업 변경만이라 해당 사항 발생 여지 없음
- 새 `pages/` 디렉토리 파일 생성 금지, DB 직접 접근 금지 — 이번 작업 범위에 DB/라우팅 변경 없음
- 이 저장소에는 자동화된 테스트 프레임워크가 없다 (`package.json`에 jest/vitest/playwright 없음). 각 태스크의 "테스트"는 `npx tsc --noEmit && npm run lint` 통과 + 특정 문자열이 더 이상 존재하지 않음을 확인하는 `grep` 체크로 대체한다.
- 참고 스펙 문서: `docs/superpowers/specs/2026-08-19-dark-redesign-design.md`

---

## 파일 구조 개요

| 파일 | 변경 여부 | 비고 |
|---|---|---|
| `src/app/globals.css` | 전면 교체 | 컬러 토큰, `.dark` 제거 |
| `src/app/layout.tsx` | 수정 | ThemeProvider·Newsreader 제거 |
| `src/components/layout/theme-toggle.tsx` | **삭제** | 라이트모드 자체가 없어짐 |
| `src/components/layout/app-sidebar.tsx` | 수정 | 하드코딩 hex → 토큰, ThemeToggle 제거 |
| `src/components/layout/sidebar-nav.tsx` | 수정 | 하드코딩 hex → 토큰 |
| `src/app/page.tsx` | 수정 | 로그인 화면 다크 통일 |
| `src/app/onboarding/page.tsx` | 수정 | 카드 스타일, font-heading 제거 |
| `src/app/(app)/dashboard/page.tsx` | 수정 | font-heading 제거 |
| `src/components/dashboard/summary-tiles.tsx` | 수정 | 테두리 제거, radius 확대 |
| `src/components/dashboard/comments-table.tsx` | **구조 변경** | `<table>` → 카드 리스트 |
| `src/app/(app)/review/page.tsx` | 수정 | 카드 스타일, font-heading 제거 |
| `src/app/(app)/settings/page.tsx` | 수정 | 카드 스타일, font-heading 제거, 위험 구역 톤 |
| `package.json` | 수정 | `next-themes` 의존성 제거 |
| `src/components/dashboard/risk-badge.tsx` | **변경 없음** | 이미 토큰 기반 (`bg-risk-*-bg text-risk-*`, `rounded-full`) — Task 1의 토큰 교체만으로 자동 재색상됨 |
| `src/components/dashboard/comment-filters.tsx` | **변경 없음** | 이미 `border-border`/`bg-background`/`text-foreground` 토큰 클래스만 사용 |
| `src/app/(app)/layout.tsx` | **변경 없음** | 이미 `bg-background` 토큰 클래스만 사용 |
| `src/components/comments/status-action-button.tsx`, `src/components/settings/danger-zone-button.tsx`, `src/components/auth/*` | **변경 없음** | shadcn `Button` variant가 토큰 기반이라 자동 재색상됨 |

---

### Task 1: 다크 전용 컬러 토큰 적용

**Files:**
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: 없음 (최초 태스크)
- Produces: 아래 CSS 커스텀 프로퍼티 값. 이후 모든 태스크는 하드코딩 hex 대신 대응하는 Tailwind 유틸리티 클래스를 쓴다.
  - `--background: #0B0E14` → `bg-background`
  - `--foreground: #F2F3F7` → `text-foreground`
  - `--card: #141822` → `bg-card`, `text-card-foreground`
  - `--sidebar: #0E1218`, `--sidebar-accent: #1B202C` → `bg-sidebar`, `bg-sidebar-accent`
  - `--primary: #D9A441` → `bg-primary`, `text-primary`
  - `--muted-foreground: #8B90A3` → `text-muted-foreground`
  - `--destructive: #E5484D` → 기존 `Button variant="destructive"`, `text-destructive`
  - `--risk-high/-medium/-low` (+ `-bg`) → `risk-badge.tsx`가 그대로 소비
  - `--font-heading` 토큰 **삭제** — 이후 태스크에서 `font-heading` 클래스 사용처를 전부 `font-semibold tracking-tight`로 교체해야 함

- [ ] **Step 1: globals.css 전체 교체**

`src/app/globals.css` 전체 내용을 아래로 교체한다:

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
  --color-sidebar-ring: var(--sidebar-ring);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar: var(--sidebar);
  --color-chart-5: var(--chart-5);
  --color-chart-4: var(--chart-4);
  --color-chart-3: var(--chart-3);
  --color-chart-2: var(--chart-2);
  --color-chart-1: var(--chart-1);
  --color-ring: var(--ring);
  --color-input: var(--input);
  --color-border: var(--border);
  --color-destructive: var(--destructive);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent: var(--accent);
  --color-muted-foreground: var(--muted-foreground);
  --color-muted: var(--muted);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-secondary: var(--secondary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary: var(--primary);
  --color-popover-foreground: var(--popover-foreground);
  --color-popover: var(--popover);
  --color-card-foreground: var(--card-foreground);
  --color-card: var(--card);
  /* 위험도 배지 전용 색 — 브랜드 팔레트와 분리된 "인장(印章)" 톤 */
  --color-risk-high: var(--risk-high);
  --color-risk-high-foreground: var(--risk-high-foreground);
  --color-risk-high-bg: var(--risk-high-bg);
  --color-risk-medium: var(--risk-medium);
  --color-risk-medium-foreground: var(--risk-medium-foreground);
  --color-risk-medium-bg: var(--risk-medium-bg);
  --color-risk-low: var(--risk-low);
  --color-risk-low-foreground: var(--risk-low-foreground);
  --color-risk-low-bg: var(--risk-low-bg);
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  --radius-2xl: calc(var(--radius) * 1.8);
  --radius-3xl: calc(var(--radius) * 2.2);
  --radius-4xl: calc(var(--radius) * 2.6);
}

:root {
  /* Reevely 다크 팔레트: 거의 블랙에 가까운 슬레이트 + 웜 앰버 포인트.
     라이트모드는 없음 — :root 하나가 유일한 팔레트. */
  --background: #0b0e14;
  --foreground: #f2f3f7;
  --card: #141822;
  --card-foreground: #f2f3f7;
  --popover: #141822;
  --popover-foreground: #f2f3f7;
  --primary: #d9a441;
  --primary-foreground: #0b0e14;
  --secondary: #1b202c;
  --secondary-foreground: #f2f3f7;
  --muted: #171b25;
  --muted-foreground: #8b90a3;
  --accent: #1b202c;
  --accent-foreground: #f2f3f7;
  --destructive: #e5484d;
  --destructive-foreground: #f2f3f7;
  --border: rgba(255, 255, 255, 0.06);
  --input: rgba(255, 255, 255, 0.12);
  --ring: #d9a441;
  --chart-1: #d9a441;
  --chart-2: #e8be73;
  --chart-3: #8b90a3;
  --chart-4: #ff8a8a;
  --chart-5: #4fa8a0;
  --radius: 0.625rem;
  --sidebar: #0e1218;
  --sidebar-foreground: #f2f3f7;
  --sidebar-primary: #d9a441;
  --sidebar-primary-foreground: #0b0e14;
  --sidebar-accent: #1b202c;
  --sidebar-accent-foreground: #f2f3f7;
  --sidebar-border: rgba(255, 255, 255, 0.06);
  --sidebar-ring: #d9a441;

  /* 위험도 배지 — 슬레이트 배경 위에서 눈이 편하도록 재조정한 톤 */
  --risk-high: #ff8a8a;
  --risk-high-foreground: #0b0e14;
  --risk-high-bg: rgba(255, 138, 138, 0.14);
  --risk-medium: #e8be73;
  --risk-medium-foreground: #0b0e14;
  --risk-medium-bg: rgba(232, 190, 115, 0.16);
  --risk-low: #9da2b5;
  --risk-low-foreground: #0b0e14;
  --risk-low-bg: rgba(139, 144, 163, 0.14);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
  html {
    @apply font-sans;
  }
}

@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* 로그인 화면 시그니처 모션 — 댓글을 조용히 훑는 스캔 라인 */
/* top은 containing block의 높이 기준으로 % 계산되므로 부모 전체를 가로지른다 */
@keyframes scan-sweep {
  0% {
    top: -2%;
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  90% {
    opacity: 1;
  }
  100% {
    top: 100%;
    opacity: 0;
  }
}

.animate-scan-sweep {
  animation: scan-sweep 6s ease-in-out infinite;
}
```

`@custom-variant dark (&:is(.dark *));`는 남겨둔다 — `html`에 `.dark` 클래스를 붙이는 코드가 이제 없으므로 이 변형은 영원히 매치되지 않아, `button.tsx` 등 vendor 코드에 남아있는 `dark:` 유틸리티가 OS의 `prefers-color-scheme`에 반응해 의도치 않게 켜지는 것을 막아준다.

- [ ] **Step 2: 검증**

```bash
grep -n "\.dark {" src/app/globals.css || echo "OK: .dark 블록 없음"
grep -n "font-heading" src/app/globals.css || echo "OK: font-heading 토큰 없음"
npx tsc --noEmit
npm run lint
```

Expected: 두 `grep`은 "OK" 출력, `tsc`/`lint` 모두 에러 없이 통과.

- [ ] **Step 3: 커밋**

```bash
git add src/app/globals.css
git commit -m "refactor: 다크 전용 컬러 토큰으로 전면 교체

라이트/다크 분기를 없애고 슬레이트 배경 + 웜 앰버 포인트
단일 팔레트로 전환. 위험도 배지 톤도 새 배경에 맞게 재조정."
```

---

### Task 2: 테마 인프라 제거 및 사이드바 재구성

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/components/layout/app-sidebar.tsx`
- Modify: `src/components/layout/sidebar-nav.tsx`
- Delete: `src/components/layout/theme-toggle.tsx`
- Modify: `package.json` (via `npm uninstall`)

**Interfaces:**
- Consumes: Task 1의 `bg-background`, `bg-sidebar`, `bg-sidebar-accent`, `text-primary`, `text-muted-foreground` 토큰 클래스
- Produces: 사이드바 활성 메뉴 스타일 패턴(`bg-sidebar-accent text-primary`) — 다른 태스크는 참조하지 않음

- [ ] **Step 1: theme-toggle.tsx 삭제**

```bash
rm src/components/layout/theme-toggle.tsx
```

- [ ] **Step 2: layout.tsx에서 ThemeProvider·Newsreader 제거**

`src/app/layout.tsx` 전체 내용을 아래로 교체한다:

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Reevely",
  description: "크리에이터를 위한 AI 기반 악성 댓글 탐지 및 증거관리",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: app-sidebar.tsx 재작성**

`src/components/layout/app-sidebar.tsx` 전체 내용을 아래로 교체한다:

```tsx
import Image from "next/image";
import Link from "next/link";

import { LogoutButton } from "@/components/auth/logout-button";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { getNextSyncAt } from "@/lib/db/queries/channels";
import { formatRelativeTime } from "@/lib/format/relative-time";

type Channel = {
  channelTitle: string;
  thumbnailUrl: string | null;
  lastSyncedAt: Date | null;
  latestVideoPublishedAt: Date | null;
};

export function AppSidebar({
  channel,
  reviewCount,
}: {
  channel: Channel;
  reviewCount: number;
}) {
  const nextSyncAt = getNextSyncAt(channel);

  return (
    <aside className="flex w-60 shrink-0 flex-col justify-between bg-sidebar px-4 py-5 text-sidebar-foreground">
      <div className="flex flex-col gap-6">
        <Link
          href="/dashboard"
          className="text-xl font-semibold tracking-tight"
        >
          Reevely
        </Link>

        <SidebarNav reviewCount={reviewCount} />
      </div>

      <div className="flex flex-col gap-3 border-t border-sidebar-border pt-4">
        <div className="flex items-center gap-2">
          {channel.thumbnailUrl && (
            <Image
              src={channel.thumbnailUrl}
              alt={channel.channelTitle}
              width={28}
              height={28}
              className="rounded-full"
            />
          )}
          <p className="truncate text-xs text-muted-foreground">
            {channel.channelTitle}
          </p>
        </div>

        {channel.lastSyncedAt && (
          <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
            마지막 확인 {formatRelativeTime(channel.lastSyncedAt)}
            <br />
            다음 확인 {formatRelativeTime(nextSyncAt)}
          </p>
        )}

        <LogoutButton className="border-sidebar-border bg-transparent text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground" />
      </div>
    </aside>
  );
}
```

- [ ] **Step 4: sidebar-nav.tsx 재작성**

`src/components/layout/sidebar-nav.tsx` 전체 내용을 아래로 교체한다:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "대시보드" },
  { href: "/review", label: "검토 필요" },
  { href: "/settings", label: "설정" },
];

export function SidebarNav({ reviewCount }: { reviewCount: number }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
              isActive
                ? "bg-sidebar-accent text-primary"
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
            }`}
          >
            <span>{item.label}</span>
            {item.href === "/review" && reviewCount > 0 && (
              <span className="font-mono text-xs text-primary">
                {reviewCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 5: next-themes 의존성 제거**

```bash
npm uninstall next-themes
```

- [ ] **Step 6: 검증**

```bash
grep -rn "next-themes\|ThemeToggle" src/ || echo "OK: 테마 토글 관련 코드 없음"
npx tsc --noEmit
npm run lint
```

Expected: `grep`은 "OK" 출력, `tsc`/`lint` 모두 에러 없이 통과.

- [ ] **Step 7: 커밋**

```bash
git add -A
git commit -m "refactor: 라이트모드·테마 토글 제거, 사이드바 다크 톤 적용

next-themes와 ThemeToggle을 삭제하고 사이드바 하드코딩 hex를
새 디자인 토큰으로 교체. 활성 메뉴는 앰버 포인트로 표시."
```

---

### Task 3: 로그인 화면 리디자인

**Files:**
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: Task 1의 `bg-sidebar`, `bg-background`, `text-primary`, `text-muted-foreground`, `bg-risk-high-bg`/`text-risk-high` 토큰
- Produces: 없음 (리프 페이지)

- [ ] **Step 1: page.tsx 재작성**

`src/app/page.tsx` 전체 내용을 아래로 교체한다 (좌/우 패널 모두 다크 톤, `font-heading` 제거, 스캔라인 그라디언트를 앰버 계열로 교체):

```tsx
import { redirect } from "next/navigation";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { getChannelByUserId } from "@/lib/db/queries/channels";
import { createClient } from "@/lib/supabase/server";

const ERROR_MESSAGES: Record<string, string> = {
  auth: "로그인 처리 중 문제가 발생했습니다. 다시 시도해 주세요.",
  no_provider_token: "구글로부터 접근 권한을 받지 못했습니다. 다시 시도해 주세요.",
  channel_connect: "유튜브 채널 연동에 실패했습니다. 채널이 있는 계정으로 다시 로그인해 주세요.",
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const errorMessage = error ? ERROR_MESSAGES[error] : undefined;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const channel = await getChannelByUserId(user.id);
    redirect(channel ? "/dashboard" : "/onboarding");
  }

  return (
    <main className="flex flex-1 flex-col md:flex-row">
      {/* 왼쪽: 브랜드 패널 — 사이드바와 같은 톤으로 살짝 분리된 레이어 */}
      <section className="relative flex flex-1 flex-col overflow-hidden bg-sidebar px-8 py-12 text-sidebar-foreground sm:px-12 md:py-16">
        <div
          aria-hidden
          className="animate-scan-sweep pointer-events-none absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
        />

        <p className="text-2xl font-semibold tracking-tight">Reevely</p>

        <div className="flex flex-1 items-center">
          <div className="max-w-sm space-y-3">
            <h1 className="text-3xl leading-snug font-semibold tracking-tight sm:text-4xl">
              악플이 아니라,
              <br />
              기록을 남깁니다.
            </h1>
            <p className="text-sm text-muted-foreground">
              당신 채널의 댓글을 조용히 지켜보고, 필요한 순간 증거로
              남겨둡니다.
            </p>
          </div>
        </div>
      </section>

      {/* 오른쪽: 페이지 배경 톤 — 실제 로그인 동작 */}
      <section className="flex flex-1 flex-col items-center justify-center gap-6 bg-background px-8 py-16 sm:px-12">
        <div className="w-full max-w-xs space-y-6 text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            시작하기
          </h2>
          {errorMessage && (
            <p className="rounded-md bg-risk-high-bg px-3 py-2 text-xs text-risk-high">
              {errorMessage}
            </p>
          )}
          <GoogleSignInButton />
          <p className="text-xs text-muted-foreground">
            유튜브 채널 읽기 권한만 요청합니다.
          </p>
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: 검증**

```bash
grep -n "#213448\|#547792\|#94B4C1\|#ECEFCA\|font-heading" src/app/page.tsx || echo "OK: 하드코딩 hex/font-heading 없음"
npx tsc --noEmit
npm run lint
```

Expected: "OK" 출력, `tsc`/`lint` 통과.

- [ ] **Step 3: 커밋**

```bash
git add src/app/page.tsx
git commit -m "refactor: 로그인 화면 다크 톤 통일

좌/우 패널 모두 다크 배경으로 맞추고 스캔라인 포인트 색을
스틸블루에서 앰버로 교체. 세리프 헤딩 폰트 제거."
```

---

### Task 4: 온보딩 화면 리디자인

**Files:**
- Modify: `src/app/onboarding/page.tsx`

**Interfaces:**
- Consumes: Task 1의 `bg-card` 토큰
- Produces: 없음 (리프 페이지)

- [ ] **Step 1: onboarding/page.tsx 재작성**

`src/app/onboarding/page.tsx` 전체 내용을 아래로 교체한다 (`font-heading` 제거, 카드 테두리 제거 + radius 확대):

```tsx
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { LogoutButton } from "@/components/auth/logout-button";
import { Button } from "@/components/ui/button";
import { getChannelByUserId } from "@/lib/db/queries/channels";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const channel = await getChannelByUserId(user.id);

  if (!channel) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          연동된 채널이 없습니다.
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          채널 연동을 해제했거나, 연동된 구글 계정에 유튜브 채널이 없는
          경우입니다. 채널이 있는 계정으로 다시 연동해 주세요.
        </p>
        <div className="w-full max-w-xs">
          <GoogleSignInButton />
        </div>
        <LogoutButton />
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="text-sm text-muted-foreground">이 채널이 맞나요?</p>

      <div className="flex flex-col items-center gap-3 rounded-2xl bg-card px-8 py-8">
        {channel.thumbnailUrl && (
          <Image
            src={channel.thumbnailUrl}
            alt={channel.channelTitle}
            width={64}
            height={64}
            priority
            className="rounded-full"
          />
        )}
        <h1 className="text-xl font-semibold tracking-tight text-card-foreground">
          {channel.channelTitle}
        </h1>
        {channel.subscriberCount != null && (
          <p className="font-mono text-xs text-muted-foreground">
            구독자 {channel.subscriberCount.toLocaleString("ko-KR")}명
          </p>
        )}
      </div>

      <Button
        nativeButton={false}
        render={<Link href="/dashboard">대시보드로 이동</Link>}
      />
    </main>
  );
}
```

- [ ] **Step 2: 검증**

```bash
grep -n "font-heading\|border-border" src/app/onboarding/page.tsx || echo "OK"
npx tsc --noEmit
npm run lint
```

Expected: "OK" 출력, `tsc`/`lint` 통과.

- [ ] **Step 3: 커밋**

```bash
git add src/app/onboarding/page.tsx
git commit -m "refactor: 온보딩 화면 카드 스타일을 테두리 없는 형태로 변경"
```

---

### Task 5: 대시보드 화면 리디자인

**Files:**
- Modify: `src/app/(app)/dashboard/page.tsx`
- Modify: `src/components/dashboard/summary-tiles.tsx`
- Modify: `src/components/dashboard/comments-table.tsx`

**Interfaces:**
- Consumes: Task 1의 `bg-card`, `text-risk-*`, `text-primary`, `text-muted-foreground` 토큰; `RiskBadge`(변경 없음), `StatusActionButton`(변경 없음)
- Produces: 댓글 카드 리스트 마크업 패턴 — Task 6(검토 큐)이 동일한 카드 톤(`rounded-2xl bg-card`)을 참고

- [ ] **Step 1: dashboard/page.tsx의 font-heading 제거**

`src/app/(app)/dashboard/page.tsx`에서:

```tsx
        <p className="font-heading text-xl text-foreground">대시보드</p>
```

를 아래로 교체:

```tsx
        <p className="text-xl font-semibold tracking-tight text-foreground">
          대시보드
        </p>
```

- [ ] **Step 2: summary-tiles.tsx 카드 스타일 변경**

`src/components/dashboard/summary-tiles.tsx`에서:

```tsx
          className="rounded-lg border border-border bg-card px-4 py-3"
```

를 아래로 교체:

```tsx
          className="rounded-2xl bg-card px-4 py-4"
```

- [ ] **Step 3: comments-table.tsx를 테이블에서 카드 리스트로 재작성**

`src/components/dashboard/comments-table.tsx` 전체 내용을 아래로 교체한다. 기존 컬럼(위험도, 유형, 댓글, 확신도, 판정 근거, 영상, 작성일, 조치)은 모두 유지하되 `<table>` 대신 카드 한 장에 담는다:

```tsx
import { Inbox } from "lucide-react";

import { StatusActionButton } from "@/components/comments/status-action-button";
import { RiskBadge } from "@/components/dashboard/risk-badge";

type Row = {
  id: string;
  text: string;
  riskLevel: string | null;
  category: string | null;
  confidence: string | null;
  reason: string | null;
  status: string;
  videoId: string;
  createdAt: Date;
};

export function CommentsTable({ rows }: { rows: Row[] }) {
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
    <div className="flex flex-col gap-2.5">
      {rows.map((row) => (
        <div key={row.id} className="rounded-2xl bg-card px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-1.5">
              <p
                className="line-clamp-2 text-[13px] text-card-foreground"
                title={row.text}
              >
                {row.text}
              </p>
              <p className="font-mono text-[11px] text-muted-foreground">
                {row.category ?? "미분류"} · confidence {row.confidence ?? "-"}{" "}
                · {row.createdAt.toLocaleDateString("ko-KR")}
              </p>
              {row.reason && (
                <p
                  className="line-clamp-2 text-[11px] text-muted-foreground"
                  title={row.reason}
                >
                  {row.reason}
                </p>
              )}
              <a
                href={`https://www.youtube.com/watch?v=${row.videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-[11px] text-primary underline underline-offset-2"
              >
                영상 보기
              </a>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-2">
              {row.riskLevel && <RiskBadge riskLevel={row.riskLevel} />}
              {row.status === "reported_false" ? (
                <span className="text-[11px] text-muted-foreground">
                  오탐 신고됨
                </span>
              ) : (
                <StatusActionButton
                  commentId={row.id}
                  status="reported_false"
                  label="오탐 신고"
                />
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: 검증**

```bash
grep -n "<table>\|font-heading\|border-border" src/app/\(app\)/dashboard/page.tsx src/components/dashboard/summary-tiles.tsx src/components/dashboard/comments-table.tsx || echo "OK: table/font-heading/border-border 없음"
npx tsc --noEmit
npm run lint
```

Expected: "OK" 출력, `tsc`/`lint` 통과. (기존에 `<table>` 관련 타입 참조가 없었으므로 `tsc`는 마크업 변경만으로 깨지지 않는다.)

- [ ] **Step 5: 커밋**

```bash
git add "src/app/(app)/dashboard/page.tsx" src/components/dashboard/summary-tiles.tsx src/components/dashboard/comments-table.tsx
git commit -m "refactor: 대시보드를 테이블에서 카드 리스트 구조로 변경

요약 타일과 댓글 목록 모두 테두리 없는 floating 카드로 통일.
데이터·동작(오탐 신고 등)은 그대로 유지."
```

---

### Task 6: 검토 큐 화면 리디자인

**Files:**
- Modify: `src/app/(app)/review/page.tsx`

**Interfaces:**
- Consumes: Task 5에서 확립한 카드 톤(`rounded-2xl bg-card`), Task 1의 토큰
- Produces: 없음 (리프 페이지)

- [ ] **Step 1: review/page.tsx 재작성**

`src/app/(app)/review/page.tsx` 전체 내용을 아래로 교체한다 (`font-heading` 제거, 카드 테두리 제거):

```tsx
import { CheckCircle2 } from "lucide-react";
import { redirect } from "next/navigation";

import { StatusActionButton } from "@/components/comments/status-action-button";
import { RiskBadge } from "@/components/dashboard/risk-badge";
import { getReviewQueue } from "@/lib/db/queries/comments";
import { createClient } from "@/lib/supabase/server";

export default async function ReviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const queue = await getReviewQueue(user.id);

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8 sm:px-10">
      <header>
        <p className="text-xl font-semibold tracking-tight text-foreground">
          검토 필요
        </p>
        <p className="text-xs text-muted-foreground">
          AI가 확신하지 못한 댓글입니다. 직접 확인해서 확정해 주세요.
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
        <div className="flex flex-col gap-3">
          {queue.map((comment) => (
            <div
              key={comment.id}
              className="flex flex-col gap-3 rounded-2xl bg-card px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  {comment.riskLevel && (
                    <RiskBadge riskLevel={comment.riskLevel} />
                  )}
                  <span className="text-xs text-muted-foreground">
                    {comment.category}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    confidence {comment.confidence}
                  </span>
                </div>
                <p className="text-sm text-card-foreground">{comment.text}</p>
                <p className="text-xs text-muted-foreground">
                  {comment.reason}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <StatusActionButton
                  commentId={comment.id}
                  status="confirmed"
                  label="악성 맞음"
                  variant="default"
                />
                <StatusActionButton
                  commentId={comment.id}
                  status="whitelisted"
                  label="아님"
                  variant="outline"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 2: 검증**

```bash
grep -n "font-heading\|border-border" "src/app/(app)/review/page.tsx" || echo "OK"
npx tsc --noEmit
npm run lint
```

Expected: "OK" 출력, `tsc`/`lint` 통과.

- [ ] **Step 3: 커밋**

```bash
git add "src/app/(app)/review/page.tsx"
git commit -m "refactor: 검토 큐 화면 카드 스타일을 테두리 없는 형태로 변경"
```

---

### Task 7: 설정 화면 리디자인

**Files:**
- Modify: `src/app/(app)/settings/page.tsx`

**Interfaces:**
- Consumes: Task 1의 `bg-card`, `bg-risk-high-bg`, `text-risk-high` 토큰
- Produces: 없음 (리프 페이지)

- [ ] **Step 1: settings/page.tsx 재작성**

`src/app/(app)/settings/page.tsx` 전체 내용을 아래로 교체한다 (`font-heading` 제거, 카드 테두리 제거, 위험 구역을 테두리 대신 배경 틴트로 표현):

```tsx
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { DangerZoneButton } from "@/components/settings/danger-zone-button";
import {
  deleteChannelByUserId,
  getChannelByUserId,
} from "@/lib/db/queries/channels";
import { deleteCommentsByUserId } from "@/lib/db/queries/comments";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const channel = await getChannelByUserId(user.id);
  const userId = user.id;

  async function disconnectChannel() {
    "use server";
    await deleteChannelByUserId(userId);
    redirect("/onboarding");
  }

  async function deleteAccount() {
    "use server";
    await deleteCommentsByUserId(userId);
    await deleteChannelByUserId(userId);

    const admin = createAdminClient();
    await admin.auth.admin.deleteUser(userId);

    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/");
  }

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8 sm:px-10">
      <header>
        <p className="text-xl font-semibold tracking-tight text-foreground">
          설정
        </p>
      </header>

      <section className="space-y-3 rounded-2xl bg-card px-5 py-4">
        <h2 className="text-sm font-medium text-card-foreground">
          연동된 채널
        </h2>
        {channel && (
          <>
            <p className="text-sm text-muted-foreground">
              {channel.channelTitle}
            </p>
            <form action={disconnectChannel}>
              <Button type="submit" variant="outline">
                채널 연동 해제
              </Button>
            </form>
          </>
        )}
      </section>

      <section className="space-y-3 rounded-2xl bg-risk-high-bg px-5 py-4">
        <h2 className="text-sm font-medium text-risk-high">위험 구역</h2>
        <p className="text-xs text-muted-foreground">
          계정을 삭제하면 연동 정보와 분석된 댓글이 모두 영구히 삭제되고,
          되돌릴 수 없습니다.
        </p>
        <form action={deleteAccount}>
          <DangerZoneButton confirmMessage="정말로 계정을 삭제하시겠습니까? 모든 데이터가 영구히 삭제되며 되돌릴 수 없습니다.">
            계정 삭제
          </DangerZoneButton>
        </form>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: 검증**

```bash
grep -n "font-heading\|border-border\|border-risk-high" "src/app/(app)/settings/page.tsx" || echo "OK"
npx tsc --noEmit
npm run lint
```

Expected: "OK" 출력, `tsc`/`lint` 통과.

- [ ] **Step 3: 커밋**

```bash
git add "src/app/(app)/settings/page.tsx"
git commit -m "refactor: 설정 화면 카드 스타일 변경, 위험 구역을 배경 틴트로 표현"
```

---

### Task 8: 최종 검증

**Files:** 없음 (검증 전용 태스크)

**Interfaces:**
- Consumes: Task 1~7의 모든 변경사항
- Produces: 없음

- [ ] **Step 1: 전체 타입 체크 + lint**

```bash
npx tsc --noEmit && npm run lint
```

Expected: 에러 0건.

- [ ] **Step 2: 남은 하드코딩 hex/구 팔레트 잔존 여부 전수 검사**

```bash
grep -rn "#213448\|#547792\|#94B4C1\|#ECEFCA\|font-heading\|next-themes" src/ || echo "OK: 구 팔레트/테마 토글 흔적 없음"
```

Expected: "OK" 출력.

- [ ] **Step 3: 개발 서버로 5개 화면 수동 검수**

```bash
npm run dev
```

`docs/superpowers/specs/2026-08-19-dark-redesign-design.md`를 펼쳐두고 아래 5개 화면을 브라우저에서 직접 열어 대조한다 (로그인 필요 화면은 실제 구글 계정으로 로그인):

- `/` — 로그인 화면: 좌/우 패널 모두 다크 톤, 스캔라인이 은은한 앰버로 보이는지
- `/onboarding` — 채널 확인 카드가 테두리 없이 표면색만으로 구분되는지
- `/dashboard` — 상단 통계 3개 타일 + 댓글 카드 리스트, 위험도 배지 3단계 색이 눈에 편한지
- `/review` — 검토 큐 카드, 액션 버튼 정상 동작(악성 맞음/아님 클릭 시 목록에서 사라지는지)
- `/settings` — 위험 구역이 붉은 틴트 배경으로 구분되는지, 계정 삭제 확인 다이얼로그 동작

문제가 있으면 해당 태스크로 돌아가 수정 후 재검증한다. 이상 없으면 완료.
