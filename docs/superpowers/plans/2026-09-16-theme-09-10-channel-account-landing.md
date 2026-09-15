# 9·10단계: 채널·계정 영역 + 랜딩페이지 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 채널 드롭다운에 계정 관련 메뉴(프로필/계정 설정/요금제 관리/알림 설정/로그아웃)를
통합하고, 사이드바·마이페이지 탭의 활성 메뉴 스타일을 진한 그린 배경+흰 텍스트로
통일한다. 랜딩페이지는 로고 표기를 소문자로 통일하고, 상단 네비에 4개 메뉴를
추가하며, 히어로/소개 카피와 CTA 문구를 스펙대로 교체한다.

**Architecture:** 4개의 독립 태스크. Task 1은 `AppSidebar`의 인터페이스(`isPro` prop
제거)가 바뀌므로 그 prop을 넘기는 두 레이아웃 파일까지 한 커밋에 묶는다. 나머지
3개 태스크는 인터페이스 변경 없는 순수 UI/카피 변경.

**Tech Stack:** Next.js App Router, React, Tailwind CSS(시맨틱 토큰), lucide-react 아이콘.

**Spec:** `docs/superpowers/specs/2026-09-15-reevely-ui-redesign.md` §"03. 랜딩페이지 (PPT p.4)",
§"11. 채널·계정 영역 (PPT p.12)"

## Global Constraints

- 색상은 반드시 `src/app/globals.css`의 시맨틱 토큰 클래스만 사용한다(`bg-primary`,
  `text-primary-foreground`, `bg-accent` 등). 하드코딩 hex 금지.
- "활성 메뉴 = 진한 그린 배경 + 흰 텍스트" pill 스타일은 이 저장소에 이미 정확히
  같은 패턴으로 구현되어 있다 — `src/components/notifications/notification-tabs.tsx:36-40`
  (`rounded-full ... bg-primary text-primary-foreground` / `text-muted-foreground hover:bg-accent`).
  이번 작업은 이 기존 패턴을 그대로 재사용한다(새로 디자인하지 않는다).
- 채널 드롭다운 통합은 **드롭다운으로 통합**하는 쪽으로 확정됨(사용자 확정,
  2026-09-16). "알림 설정" 메뉴는 새 설정 화면을 만들지 않고 기존 알림 피드
  (`/c/[channelId]/notifications`)로 연결한다(사용자 확정, 2026-09-16).
- "새 채널 연동"은 유튜브 단일 버튼을 유지한다 — 플랫폼 선택(YouTube/Instagram/TikTok)
  UI는 만들지 않는다(사용자 확정, 2026-09-16). 기존 "채널 추가" 버튼/문구/동작은
  손대지 않는다.
- 랜딩 상단 네비 4개(서비스소개/요금제/고객사례/리소스)는 전부 넣되, 콘텐츠가
  없는 고객사례·리소스는 클릭 가능한 링크로 만들지 않고 "준비 중" 상태로
  표시한다(사용자 확정, 2026-09-16).
- CTA 버튼 "시작하기" 3곳 중 히어로="무료로 시작하기", 나머지 2곳(가격 섹션 뒤/
  마무리 CTA)="내 채널 보호하기"(사용자 확정, 2026-09-16).
- 로고는 소문자 "reevely"로 통일한다(스펙 "로고 `reevely` 소문자 또는 로고
  이미지 통일" — 별도 로고 이미지 에셋이 없으므로 소문자 텍스트 방식을 택함).
  브라우저 탭 제목(`src/app/layout.tsx`의 `title: "Reevely"`)은 시각적 UI 요소가
  아니므로 이번 범위에 포함하지 않는다.
- Primary 버튼의 hover 색(`hover:bg-primary/80`, `src/components/ui/button.tsx`)을
  스펙이 명시한 `#1E2D26`로 바꾸는 것은 앱 전체 버튼에 영향을 주는 전역 컴포넌트
  변경이라 이번 두 화면 범위에서 다루지 않는다 — ⑪ 전체 화면 재점검으로 미룬다.

---

### Task 1: 채널 드롭다운에 계정 메뉴 통합

**Files:**
- Modify: `src/components/layout/app-sidebar.tsx`
- Modify: `src/app/(app)/mypage/layout.tsx`
- Modify: `src/app/(app)/c/[channelId]/layout.tsx`

**Interfaces:**
- `AppSidebar`의 props에서 `isPro: boolean`을 제거한다. 이 prop을 넘기던 두
  레이아웃 파일도 같은 커밋에서 함께 고친다(빌드 깨지는 중간 커밋 금지).

- [ ] **Step 1: `app-sidebar.tsx`의 import 구문 수정**

기존(1-12행):

```tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertTriangle, ChevronDown, Lock, Menu, Plus, X } from "lucide-react";
import { useState } from "react";

import { LogoutButton } from "@/components/auth/logout-button";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { SyncCountdown } from "@/components/layout/sync-countdown";
import { formatClockTime } from "@/lib/format/clock-time";
```

교체:

```tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  ChevronDown,
  CreditCard,
  Lock,
  Menu,
  Plus,
  Settings,
  User,
  X,
} from "lucide-react";
import { useState } from "react";

import { LogoutButton } from "@/components/auth/logout-button";
import { BellIcon } from "@/components/icons/bell-icon";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { SyncCountdown } from "@/components/layout/sync-countdown";
import { formatClockTime } from "@/lib/format/clock-time";
```

- [ ] **Step 2: `AppSidebar` 함수 시그니처에서 `isPro` 제거**

기존:

```tsx
export function AppSidebar({
  channels,
  activeChannelId,
  planLabel,
  isPro,
  reviewCount,
  unreadNotificationCount,
  atChannelLimit,
}: {
  channels: SidebarChannel[];
  activeChannelId?: string;
  planLabel: string;
  isPro: boolean;
  reviewCount: number;
  unreadNotificationCount: number;
  atChannelLimit: boolean;
}) {
```

교체:

```tsx
export function AppSidebar({
  channels,
  activeChannelId,
  planLabel,
  reviewCount,
  unreadNotificationCount,
  atChannelLimit,
}: {
  channels: SidebarChannel[];
  activeChannelId?: string;
  planLabel: string;
  reviewCount: number;
  unreadNotificationCount: number;
  atChannelLimit: boolean;
}) {
```

- [ ] **Step 3: 채널 드롭다운에 계정 메뉴 4개 추가**

기존(채널 목록 뒤, "채널 추가" 링크 다음에 드롭다운 패널이 닫히는 부분):

```tsx
                  <Link
                    href={
                      atChannelLimit
                        ? "/mypage/account?error=channel_limit"
                        : "/channel-connect/start"
                    }
                    onClick={() => setIsSwitcherOpen(false)}
                    className="flex items-center gap-2 border-t border-sidebar-border px-3 py-2 text-sm text-primary hover:bg-sidebar-accent"
                  >
                    <Plus className="size-3.5 shrink-0" aria-hidden />
                    채널 추가
                  </Link>
                </div>
              )}
            </div>
          )}
```

교체(계정 메뉴 블록 + 로그아웃 블록 추가):

```tsx
                  <Link
                    href={
                      atChannelLimit
                        ? "/mypage/account?error=channel_limit"
                        : "/channel-connect/start"
                    }
                    onClick={() => setIsSwitcherOpen(false)}
                    className="flex items-center gap-2 border-t border-sidebar-border px-3 py-2 text-sm text-primary hover:bg-sidebar-accent"
                  >
                    <Plus className="size-3.5 shrink-0" aria-hidden />
                    채널 추가
                  </Link>
                  <div className="border-t border-sidebar-border py-1">
                    <Link
                      href="/mypage/profile"
                      onClick={() => setIsSwitcherOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent"
                    >
                      <User
                        className="size-3.5 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                      내 프로필
                    </Link>
                    <Link
                      href="/mypage/account"
                      onClick={() => setIsSwitcherOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent"
                    >
                      <Settings
                        className="size-3.5 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                      계정 설정
                    </Link>
                    <Link
                      href="/mypage/subscription/plans"
                      onClick={() => setIsSwitcherOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent"
                    >
                      <CreditCard
                        className="size-3.5 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                      요금제 관리
                    </Link>
                    <Link
                      href={`/c/${activeChannel.id}/notifications`}
                      onClick={() => setIsSwitcherOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent"
                    >
                      <BellIcon className="size-3.5 shrink-0 text-muted-foreground" />
                      알림 설정
                    </Link>
                  </div>
                  <div className="border-t border-sidebar-border p-2">
                    <LogoutButton className="w-full justify-center border-sidebar-border bg-transparent text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground" />
                  </div>
                </div>
              )}
            </div>
          )}
```

- [ ] **Step 4: 사이드바 하단 푸터에서 플랜 링크·로그아웃 버튼 제거(드롭다운으로 이동했으므로 중복 제거), 플랜 라벨은 정보 표시로 남김**

기존:

```tsx
        <div className="flex flex-col gap-3 border-t border-sidebar-border pt-4">
          <Link
            href="/mypage/subscription/plans"
            className="flex items-center justify-between rounded-lg px-1 py-1 hover:bg-sidebar-accent"
          >
            <span className="truncate text-xs text-muted-foreground">
              {planLabel} 플랜
            </span>
            {!isPro && (
              <span className="shrink-0 text-xs font-medium text-primary">
                업그레이드
              </span>
            )}
          </Link>

          {activeChannel?.reauthRequiredAt ? (
            <p className="text-[11px] leading-relaxed text-risk-high">
              유튜브 연동이 끊어져 새 댓글을 가져오지 못하고 있어요.
              <br />
              <Link href="/channel-connect/start" className="font-medium underline">
                다시 연동하기
              </Link>
            </p>
          ) : (
            activeChannel?.lastSyncedAt && (
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                최근 댓글 업데이트 {formatClockTime(activeChannel.lastSyncedAt)}
                <br />
                다음 댓글 업데이트{" "}
                <SyncCountdown target={activeChannel.nextSyncAt} />
              </p>
            )
          )}

          <LogoutButton className="border-sidebar-border bg-transparent text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground" />
        </div>
      </aside>
    </>
  );
}
```

교체:

```tsx
        <div className="flex flex-col gap-3 border-t border-sidebar-border pt-4">
          <p className="truncate text-xs text-muted-foreground">
            {planLabel} 플랜
          </p>

          {activeChannel?.reauthRequiredAt ? (
            <p className="text-[11px] leading-relaxed text-risk-high">
              유튜브 연동이 끊어져 새 댓글을 가져오지 못하고 있어요.
              <br />
              <Link href="/channel-connect/start" className="font-medium underline">
                다시 연동하기
              </Link>
            </p>
          ) : (
            activeChannel?.lastSyncedAt && (
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                최근 댓글 업데이트 {formatClockTime(activeChannel.lastSyncedAt)}
                <br />
                다음 댓글 업데이트{" "}
                <SyncCountdown target={activeChannel.nextSyncAt} />
              </p>
            )
          )}
        </div>
      </aside>
    </>
  );
}
```

- [ ] **Step 5: `mypage/layout.tsx`에서 `isPro` 계산·전달 제거**

`src/app/(app)/mypage/layout.tsx`에서 기존:

```tsx
  const planLabel = subscription ? PLAN_LABELS[subscription.plan] : "무료";
  const isPro = subscription?.plan === "pro";

  return (
    <div className="flex h-dvh flex-col overflow-hidden md:flex-row">
      <AppSidebar
        channels={channelsWithSync}
        planLabel={planLabel}
        isPro={isPro}
        reviewCount={reviewCount}
        unreadNotificationCount={unreadNotificationCount}
        atChannelLimit={atChannelLimit}
      />
```

교체:

```tsx
  const planLabel = subscription ? PLAN_LABELS[subscription.plan] : "무료";

  return (
    <div className="flex h-dvh flex-col overflow-hidden md:flex-row">
      <AppSidebar
        channels={channelsWithSync}
        planLabel={planLabel}
        reviewCount={reviewCount}
        unreadNotificationCount={unreadNotificationCount}
        atChannelLimit={atChannelLimit}
      />
```

- [ ] **Step 6: `c/[channelId]/layout.tsx`에서 `isPro` 계산·전달 제거**

`src/app/(app)/c/[channelId]/layout.tsx`에서 기존:

```tsx
  const planLabel = subscription ? PLAN_LABELS[subscription.plan] : "무료";
  const isPro = subscription?.plan === "pro";

  return (
    <div className="flex h-dvh flex-col overflow-hidden md:flex-row">
      <AppSidebar
        channels={channelsWithSync}
        activeChannelId={channelId}
        planLabel={planLabel}
        isPro={isPro}
        reviewCount={reviewCount}
        unreadNotificationCount={unreadNotificationCount}
        atChannelLimit={atChannelLimit}
      />
```

교체:

```tsx
  const planLabel = subscription ? PLAN_LABELS[subscription.plan] : "무료";

  return (
    <div className="flex h-dvh flex-col overflow-hidden md:flex-row">
      <AppSidebar
        channels={channelsWithSync}
        activeChannelId={channelId}
        planLabel={planLabel}
        reviewCount={reviewCount}
        unreadNotificationCount={unreadNotificationCount}
        atChannelLimit={atChannelLimit}
      />
```

- [ ] **Step 7: 빌드 검증**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음 (특히 `isPro` 관련 미사용 변수/프롭 타입 에러가 없는지 확인)

- [ ] **Step 8: 커밋**

```bash
git add src/components/layout/app-sidebar.tsx src/app/\(app\)/mypage/layout.tsx "src/app/(app)/c/[channelId]/layout.tsx"
git commit -m "feat: 채널 드롭다운에 프로필·계정설정·요금제·알림·로그아웃 메뉴 통합"
```

---

### Task 2: 활성 메뉴 스타일 통일 (진한 그린 배경 + 흰 텍스트)

**Files:**
- Modify: `src/components/layout/sidebar-nav.tsx`
- Modify: `src/components/mypage/mypage-nav.tsx`

**Interfaces:**
- 없음. 두 컴포넌트의 export 시그니처는 그대로.

- [ ] **Step 1: `sidebar-nav.tsx`의 활성 상태 배경/텍스트 색 교체**

기존(전체 파일 33-59행 부분):

```tsx
  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const href = channelId ? `/c/${channelId}/${item.path}` : "/mypage";
        const isActive = pathname === href;
        const countKey = BADGE_COUNT_PATH[item.path];
        const count = countKey ? counts[countKey] : 0;

        return (
          <Link
            key={item.path}
            href={href}
            className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
              isActive
                ? "bg-sidebar-accent text-primary"
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
            }`}
          >
            <span>{item.label}</span>
            {count > 0 && (
              <span className="font-mono text-xs text-primary">{count}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
```

교체:

```tsx
  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const href = channelId ? `/c/${channelId}/${item.path}` : "/mypage";
        const isActive = pathname === href;
        const countKey = BADGE_COUNT_PATH[item.path];
        const count = countKey ? counts[countKey] : 0;

        return (
          <Link
            key={item.path}
            href={href}
            className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
            }`}
          >
            <span>{item.label}</span>
            {count > 0 && (
              <span
                className={`font-mono text-xs ${
                  isActive ? "text-primary-foreground" : "text-primary"
                }`}
              >
                {count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
```

(활성 상태가 이제 배경을 꽉 채우는 진한 그린이라, 배지 숫자 색도 활성일 때는
흰색으로 바꿔야 녹색 배경 위에서 읽힌다 — 안 바꾸면 초록 배경에 초록 글자가 돼서
안 보임.)

- [ ] **Step 2: `mypage-nav.tsx`를 밑줄 탭에서 pill 탭으로 교체**

이 저장소에는 이미 똑같은 "진한 그린 배경+흰 텍스트" pill 탭 패턴이
`src/components/notifications/notification-tabs.tsx:36-40`에 구현되어 있다. 그
패턴을 그대로 재사용한다.

전체 파일(`src/components/mypage/mypage-nav.tsx`)을 아래로 교체:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/mypage", label: "구독 작성자" },
  { href: "/mypage/subscription", label: "구독 플랜" },
  { href: "/mypage/account", label: "계정/채널" },
  { href: "/mypage/profile", label: "프로필" },
];

export function MypageNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2 border-b border-border pb-4">
      {TABS.map((tab) => {
        const isActive = pathname === tab.href;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 3: 빌드 검증**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add src/components/layout/sidebar-nav.tsx src/components/mypage/mypage-nav.tsx
git commit -m "feat: 사이드바·마이페이지 활성 메뉴를 진한 그린 배경+흰 텍스트로 통일"
```

---

### Task 3: 사이드바·푸터 로고 소문자 통일

**Files:**
- Modify: `src/components/layout/app-sidebar.tsx`
- Modify: `src/components/landing/site-footer.tsx`

**Interfaces:** 없음.

- [ ] **Step 1: `app-sidebar.tsx` 모바일 헤더 로고 텍스트**

기존:

```tsx
        <Link
          href={homeHref}
          className="text-lg font-semibold tracking-tight text-sidebar-foreground"
        >
          Reevely
        </Link>
```

교체:

```tsx
        <Link
          href={homeHref}
          className="text-lg font-semibold tracking-tight text-sidebar-foreground"
        >
          reevely
        </Link>
```

- [ ] **Step 2: `app-sidebar.tsx` 데스크톱 사이드바 로고 텍스트**

기존:

```tsx
            <Link
              href={homeHref}
              className="text-xl font-semibold tracking-tight"
            >
              Reevely
            </Link>
```

교체:

```tsx
            <Link
              href={homeHref}
              className="text-xl font-semibold tracking-tight"
            >
              reevely
            </Link>
```

- [ ] **Step 3: `site-footer.tsx` 로고 텍스트**

기존:

```tsx
          <p className="text-base font-semibold tracking-tight text-foreground">
            Reevely
          </p>
```

교체:

```tsx
          <p className="text-base font-semibold tracking-tight text-foreground">
            reevely
          </p>
```

- [ ] **Step 4: 빌드 검증**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음

- [ ] **Step 5: 커밋**

```bash
git add src/components/layout/app-sidebar.tsx src/components/landing/site-footer.tsx
git commit -m "feat: 로고 표기를 소문자 reevely로 통일"
```

---

### Task 4: 랜딩페이지 상단 네비 + 카피 개편

**Files:**
- Modify: `src/app/page.tsx`

**Interfaces:** 없음.

- [ ] **Step 1: 상단 네비게이션에 로고 소문자화 + 4개 메뉴 추가**

기존:

```tsx
      {/* 상단 내비게이션 */}
      <header className="flex items-center justify-between px-8 py-5 sm:px-12">
        <p className="text-lg font-semibold tracking-tight text-foreground">
          Reevely
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-auto"
            nativeButton={false}
            render={<a href="/admin/login">관리자 페이지</a>}
          />
          <KakaoSignInButton
            label="로그인"
            variant="ghost"
            size="sm"
            className="w-auto"
          />
          <KakaoSignInButton
            label="회원가입"
            variant="outline"
            size="sm"
            className="w-auto"
          />
        </div>
      </header>
```

교체:

```tsx
      {/* 상단 내비게이션 */}
      <header className="flex items-center justify-between px-8 py-5 sm:px-12">
        <p className="text-lg font-semibold tracking-tight text-foreground">
          reevely
        </p>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <a href="#intro" className="hover:text-foreground">
            서비스소개
          </a>
          <a href="#pricing" className="hover:text-foreground">
            요금제
          </a>
          <span
            title="준비 중입니다"
            className="cursor-default text-muted-foreground/50"
          >
            고객사례
          </span>
          <span
            title="준비 중입니다"
            className="cursor-default text-muted-foreground/50"
          >
            리소스
          </span>
        </nav>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-auto"
            nativeButton={false}
            render={<a href="/admin/login">관리자 페이지</a>}
          />
          <KakaoSignInButton
            label="로그인"
            variant="ghost"
            size="sm"
            className="w-auto"
          />
          <KakaoSignInButton
            label="회원가입"
            variant="outline"
            size="sm"
            className="w-auto"
          />
        </div>
      </header>
```

- [ ] **Step 2: 히어로 카피 교체 + CTA 문구를 "무료로 시작하기"로**

기존:

```tsx
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
          <h1 className="text-4xl leading-snug font-semibold tracking-tight sm:text-5xl">
            악플이 아니라,
            <br />
            기록을 남깁니다.
          </h1>
          <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
            소속사도 법무팀도 없는 채널이 대부분입니다. 당신 채널의 댓글을
            대신 지켜보고, AI로 위험도를 판정해 필요한 순간 증거로
            남겨둡니다.
          </p>
          {errorMessage && (
            <p className="rounded-md bg-risk-high-bg px-3 py-2 text-xs text-risk-high">
              {errorMessage}
            </p>
          )}
          <KakaoSignInButton
            label="시작하기"
            className="h-12 w-auto px-10 text-base"
          />
          <p className="text-xs text-muted-foreground">
            카카오 로그인 후 유튜브 채널을 연동합니다.
          </p>
        </div>
      </section>

      {/* 왜 필요한가 */}
      <section className="border-b border-border bg-background px-8 py-16 sm:px-12">
        <div className="mx-auto max-w-2xl space-y-3 text-center">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            구독자가 늘수록, 댓글창은 혼자 감당하기 버거워집니다
          </h2>
          <p className="text-sm text-muted-foreground">
            구독자 1만~50만, 소속사나 법무팀 없이 채널을 운영하는
            크리에이터를 위해 만들었습니다. 매번 댓글창을 직접 훑어보지
            않아도, 위험한 댓글은 자동으로 걸러서 보여드려요.
          </p>
        </div>
      </section>
```

교체:

```tsx
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
          <h1 className="text-4xl leading-snug font-semibold tracking-tight sm:text-5xl">
            좋은 크리에이터의 내일을 지킵니다
          </h1>
          <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
            AI가 댓글을 먼저 읽고 위험도를 판단합니다. 크리에이터는 필요한
            댓글만 확인하세요.
          </p>
          {errorMessage && (
            <p className="rounded-md bg-risk-high-bg px-3 py-2 text-xs text-risk-high">
              {errorMessage}
            </p>
          )}
          <KakaoSignInButton
            label="무료로 시작하기"
            className="h-12 w-auto px-10 text-base"
          />
          <p className="text-xs text-muted-foreground">
            카카오 로그인 후 유튜브 채널을 연동합니다.
          </p>
        </div>
      </section>

      {/* 왜 필요한가 */}
      <section id="intro" className="border-b border-border bg-background px-8 py-16 sm:px-12">
        <div className="mx-auto max-w-2xl space-y-3 text-center">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            구독자가 늘수록, 댓글창은 혼자 감당하기 버거워집니다
          </h2>
          <p className="text-sm text-muted-foreground">
            혼자 댓글을 관리하는 크리에이터를 위해 만들었습니다. 매번
            댓글창을 직접 훑어보지 않아도, 위험한 댓글은 자동으로 걸러서
            보여드려요.
          </p>
        </div>
      </section>
```

- [ ] **Step 3: 요금제 섹션에 anchor id 추가 + CTA 문구를 "내 채널 보호하기"로**

기존:

```tsx
      {/* 요금제 */}
      <section className="border-b border-border bg-background px-8 py-16 sm:px-12">
        <div className="mx-auto max-w-6xl">
          <PricingTable />

          <div className="mt-8 flex flex-col items-center gap-3 text-center">
            <KakaoSignInButton
              label="시작하기"
              className="h-12 w-auto px-10 text-base"
            />
            <p className="text-xs text-muted-foreground">
              지금 가입하면 정식 출시 시 가장 먼저 안내드립니다.
            </p>
          </div>
        </div>
      </section>
```

교체:

```tsx
      {/* 요금제 */}
      <section id="pricing" className="border-b border-border bg-background px-8 py-16 sm:px-12">
        <div className="mx-auto max-w-6xl">
          <PricingTable />

          <div className="mt-8 flex flex-col items-center gap-3 text-center">
            <KakaoSignInButton
              label="내 채널 보호하기"
              className="h-12 w-auto px-10 text-base"
            />
            <p className="text-xs text-muted-foreground">
              지금 가입하면 정식 출시 시 가장 먼저 안내드립니다.
            </p>
          </div>
        </div>
      </section>
```

- [ ] **Step 4: 마무리 CTA 버튼 문구를 "내 채널 보호하기"로**

기존:

```tsx
      {/* 마무리 CTA */}
      <section className="bg-background px-8 py-16 text-center text-foreground sm:px-12">
        <div className="mx-auto flex max-w-xl flex-col items-center gap-5">
          <h2 className="text-2xl font-semibold tracking-tight">
            지금 채널을 연동해 보세요
          </h2>
          <p className="text-sm text-muted-foreground">
            카카오 로그인 후 유튜브 채널을 연동합니다.
          </p>
          <KakaoSignInButton
            label="시작하기"
            className="h-12 w-auto px-10 text-base"
          />
        </div>
      </section>
```

교체:

```tsx
      {/* 마무리 CTA */}
      <section className="bg-background px-8 py-16 text-center text-foreground sm:px-12">
        <div className="mx-auto flex max-w-xl flex-col items-center gap-5">
          <h2 className="text-2xl font-semibold tracking-tight">
            지금 채널을 연동해 보세요
          </h2>
          <p className="text-sm text-muted-foreground">
            카카오 로그인 후 유튜브 채널을 연동합니다.
          </p>
          <KakaoSignInButton
            label="내 채널 보호하기"
            className="h-12 w-auto px-10 text-base"
          />
        </div>
      </section>
```

- [ ] **Step 5: 빌드 검증**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음

- [ ] **Step 6: 커밋**

```bash
git add src/app/page.tsx
git commit -m "feat: 랜딩페이지 상단 네비 추가 및 히어로/CTA 카피 개편"
```

---

## 참고: 이번 계획에서 다루지 않는 것

- Primary 버튼 hover 색(`#1E2D26`) — 전역 버튼 컴포넌트 변경이라 ⑪로 미룸.
- "고객사례"/"리소스" 실제 콘텐츠 제작 — 이번엔 "준비 중" 표시만, 콘텐츠 자체는
  범위 밖(사용자 확정, 2026-09-16).
- 채널 연동 플랫폼 선택 UI(Instagram/TikTok) — 실제 지원 기능이 없어 이번엔
  만들지 않음(사용자 확정, 2026-09-16).
- 반응형/모바일 점검(새 상단 네비가 `md:flex`로 모바일에서 숨겨짐) — ⑫에서 다룸.
