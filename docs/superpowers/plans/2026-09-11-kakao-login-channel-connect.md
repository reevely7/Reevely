# 카카오 로그인 + 채널 연동 분리 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reevely 로그인을 카카오로 바꾸고, 유튜브 채널 연동을 Supabase 세션과 무관한 별도의
순수 구글 OAuth 흐름으로 분리한다.

**Architecture:** `GoogleSignInButton`을 `KakaoSignInButton`(Supabase Kakao 프로바이더)으로
교체하고, `auth/callback`은 순수 로그인 세션 생성만 담당하도록 단순화한다. 채널 연동은
`/channel-connect/start`(구글 OAuth URL로 리다이렉트) → `/channel-connect/callback`(인가
코드를 토큰으로 교환 후 기존 `connectChannel()` 재사용)이라는 별도 라우트 쌍으로 새로 만든다.
이번 계획은 멀티 채널 스키마(채널 여러 개 허용, `/c/[channelId]` 라우트 등)는 다루지 않는다 —
`channels` 테이블은 여전히 유저당 1개 제약을 유지한 채로 간다.

**Tech Stack:** Next.js App Router, Supabase Auth(Kakao 프로바이더 — 콘솔 설정 이미 완료됨),
raw `fetch()` 기반 구글 OAuth 2.0 (SDK 없이 직접 구현, 기존 `src/lib/youtube/` 컨벤션과 동일)

**Spec:** `docs/superpowers/specs/2026-09-11-multi-channel-design.md`의 "로그인 체계"·"채널
연동 흐름" 섹션 (이번 계획은 그 두 섹션만 구현하고 나머지 섹션은 다음 계획으로 미룸)

## Global Constraints

- App Router만 사용, `pages/` 디렉터리 생성 금지
- DB 접근은 전부 `src/lib/db/queries/*`를 거친다
- `any` 타입 금지 (불가피하면 `unknown` + 타입가드)
- 프로덕션 코드(`src/`)에 `console.log` 금지, 에러 로깅은 `console.error`만
- 외부 API 호출은 raw `fetch()` — 새 HTTP 클라이언트/SDK 라이브러리 추가 금지 (기존
  `src/lib/youtube/connect-channel.ts`, `refresh-access-token.ts` 패턴을 그대로 따를 것)
- 커밋 전 `npx tsc --noEmit && npm run lint` 통과 확인
- 커밋 메시지: `feat|fix|docs|refactor: 간결한 설명`

---

## Task 1: KakaoSignInButton 컴포넌트

**Files:**
- Create: `src/components/auth/kakao-sign-in-button.tsx`

**Interfaces:**
- Produces: `<KakaoSignInButton label? className? variant? size? />` — 기존
  `GoogleSignInButton`과 동일한 props 인터페이스. Task 2가 이 컴포넌트를 가져다 쓴다.

- [ ] **Step 1: 기존 GoogleSignInButton 확인**

`src/components/auth/google-sign-in-button.tsx`를 참고용으로 읽어본다(이미 존재하는 파일,
수정하지 않음 — Task 5에서 삭제 예정).

- [ ] **Step 2: KakaoSignInButton 작성**

```tsx
"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type Props = {
  label?: string;
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg";
};

export function KakaoSignInButton({
  label = "카카오로 계속하기",
  className,
  variant = "default",
  size = "lg",
}: Props) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignIn() {
    setIsLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className ?? "w-full"}
      onClick={handleSignIn}
      disabled={isLoading}
    >
      {isLoading ? "이동하는 중…" : label}
    </Button>
  );
}
```

- [ ] **Step 3: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add src/components/auth/kakao-sign-in-button.tsx
git commit -m "feat: 카카오 로그인 버튼 컴포넌트 추가"
```

---

## Task 2: 랜딩 페이지를 카카오 로그인으로 교체

**Files:**
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `KakaoSignInButton` (Task 1)

- [ ] **Step 1: import 교체**

`src/app/page.tsx` 상단의

```ts
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
```

를

```ts
import { KakaoSignInButton } from "@/components/auth/kakao-sign-in-button";
```

로 바꾼다.

- [ ] **Step 2: 헤더의 로그인/회원가입 버튼 교체**

```tsx
<GoogleSignInButton
  label="로그인"
  variant="ghost"
  size="sm"
  className="w-auto"
/>
<GoogleSignInButton
  label="회원가입"
  variant="outline"
  size="sm"
  className="w-auto"
/>
```

를

```tsx
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
```

로 바꾼다.

- [ ] **Step 3: 히어로 섹션의 "시작하기" 버튼 교체 + 문구 수정**

```tsx
<GoogleSignInButton
  label="시작하기"
  className="h-12 w-auto px-10 text-base"
/>
<p className="text-xs text-muted-foreground">
  유튜브 채널 읽기 권한만 요청합니다.
</p>
```

를

```tsx
<KakaoSignInButton
  label="시작하기"
  className="h-12 w-auto px-10 text-base"
/>
<p className="text-xs text-muted-foreground">
  카카오 로그인 후 유튜브 채널을 연동합니다.
</p>
```

로 바꾼다 (기존 문구는 "구글로 로그인하면서 유튜브 권한도 같이 받는다"는 옛 흐름 설명이라,
로그인과 채널 연동이 분리된 지금 구조에 맞게 고친다).

- [ ] **Step 4: 가격표 아래 "시작하기" 버튼 교체**

```tsx
<GoogleSignInButton
  label="시작하기"
  className="h-12 w-auto px-10 text-base"
/>
```

(바로 위에 "결제 기능은 아직 준비 중입니다..." 문구가 있는 블록, 요금제 비교표 다음에 나옴)
를

```tsx
<KakaoSignInButton
  label="시작하기"
  className="h-12 w-auto px-10 text-base"
/>
```

로 바꾼다. 이 블록의 안내 문구("결제 기능은 아직 준비 중입니다...")는 로그인 방식과 무관한
내용이라 그대로 둔다.

- [ ] **Step 5: 마무리 CTA 섹션의 버튼 교체 + 문구 수정**

```tsx
<p className="text-sm text-muted-foreground">
  유튜브 채널 읽기 권한만 요청합니다.
</p>
<GoogleSignInButton
  label="시작하기"
  className="h-12 w-auto px-10 text-base"
/>
```

를

```tsx
<p className="text-sm text-muted-foreground">
  카카오 로그인 후 유튜브 채널을 연동합니다.
</p>
<KakaoSignInButton
  label="시작하기"
  className="h-12 w-auto px-10 text-base"
/>
```

로 바꾼다 (제목 "지금 채널을 연동해 보세요"는 그대로 둔다).

- [ ] **Step 6: 타입체크 및 린트**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음

- [ ] **Step 7: 커밋**

```bash
git add src/app/page.tsx
git commit -m "feat: 랜딩 페이지 로그인을 카카오로 교체"
```

---

## Task 3: auth/callback 단순화 (로그인 세션 생성만 담당)

**Files:**
- Modify: `src/app/auth/callback/route.ts`

**Interfaces:**
- Consumes: `getChannelByUserId` (`src/lib/db/queries/channels.ts`, 기존 함수 그대로)

- [ ] **Step 1: 라우트 전체 교체**

`src/app/auth/callback/route.ts`의 전체 내용을 다음으로 교체한다 (더 이상 `connectChannel`을
호출하지 않고, `provider_token` 체크도 제거 — 카카오 로그인은 유튜브 권한과 무관하다):

```ts
import { NextResponse } from "next/server";

import { getChannelByUserId } from "@/lib/db/queries/channels";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session && data.user) {
      const channel = await getChannelByUserId(data.user.id);
      return NextResponse.redirect(
        `${origin}${channel ? "/dashboard" : "/onboarding"}`,
      );
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth`);
}
```

- [ ] **Step 2: 타입체크 및 린트**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add src/app/auth/callback/route.ts
git commit -m "refactor: auth callback에서 채널 연동 로직 분리"
```

---

## Task 4: 구글 인가 코드 → 토큰 교환 함수

**Files:**
- Create: `src/lib/youtube/exchange-auth-code.ts`

**Interfaces:**
- Produces: `exchangeAuthCodeForTokens(code: string, redirectUri: string): Promise<{ accessToken: string; refreshToken: string | null }>`
  — Task 5가 이 함수를 가져다 쓴다.

- [ ] **Step 1: 기존 refresh-access-token.ts 스타일 확인**

`src/lib/youtube/refresh-access-token.ts`를 참고한다(같은 raw fetch 패턴, `grant_type`만
다름 — `authorization_code` vs `refresh_token`).

- [ ] **Step 2: 파일 작성**

```ts
import "server-only";

export async function exchangeAuthCodeForTokens(
  code: string,
  redirectUri: string,
) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    throw new Error(`Google 인가 코드 교환 실패 (${response.status})`);
  }

  const data: { access_token: string; refresh_token?: string } =
    await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
  };
}
```

- [ ] **Step 3: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add src/lib/youtube/exchange-auth-code.ts
git commit -m "feat: 구글 OAuth 인가 코드 교환 함수 추가"
```

---

## Task 5: 채널 연동 라우트(start/callback) + 온보딩 CTA 교체 + 구 컴포넌트 정리

**Files:**
- Create: `src/app/channel-connect/start/route.ts`
- Create: `src/app/channel-connect/callback/route.ts`
- Modify: `src/app/onboarding/page.tsx`
- Delete: `src/components/auth/google-sign-in-button.tsx`

**Interfaces:**
- Consumes: `exchangeAuthCodeForTokens` (Task 4), `connectChannel`(`src/lib/youtube/connect-channel.ts`,
  기존 함수 그대로), `createClient`(`src/lib/supabase/server.ts`)

**중요 — 구현 전 확인 필요:** 이 태스크를 실제로 브라우저에서 테스트하려면 Google Cloud
Console의 OAuth 클라이언트(`GOOGLE_CLIENT_ID`가 속한 프로젝트)의 "승인된 리디렉션 URI" 목록에
`http://localhost:3000/channel-connect/callback`을 새로 등록해야 한다(기존에 Supabase용으로
등록된 `https://<supabase-project-ref>.supabase.co/auth/v1/callback`과는 별개). 등록 안 하면
구글이 `redirect_uri_mismatch` 에러를 낸다. 코드 작성 자체는 이 등록 없이도 가능하지만, Step
6(브라우저 검증)을 하려면 먼저 등록해야 한다.

- [ ] **Step 1: 시작 라우트 작성 (구글 OAuth URL로 리다이렉트)**

```ts
// src/app/channel-connect/start/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";

const STATE_COOKIE = "channel_connect_state";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  const { origin } = new URL(request.url);
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
  authUrl.searchParams.set(
    "redirect_uri",
    `${origin}/channel-connect/callback`,
  );
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set(
    "scope",
    "https://www.googleapis.com/auth/youtube.force-ssl",
  );
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl);
}
```

- [ ] **Step 2: 콜백 라우트 작성 (토큰 교환 + 채널 연동)**

```ts
// src/app/channel-connect/callback/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { connectChannel } from "@/lib/youtube/connect-channel";
import { exchangeAuthCodeForTokens } from "@/lib/youtube/exchange-auth-code";

const STATE_COOKIE = "channel_connect_state";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/`);
  }

  const cookieStore = await cookies();
  const savedState = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);

  if (!code || !state || !savedState || state !== savedState) {
    return NextResponse.redirect(`${origin}/onboarding?error=channel_connect`);
  }

  try {
    const { accessToken, refreshToken } = await exchangeAuthCodeForTokens(
      code,
      `${origin}/channel-connect/callback`,
    );
    await connectChannel({ userId: user.id, accessToken, refreshToken });
    return NextResponse.redirect(`${origin}/dashboard`);
  } catch (e) {
    console.error("채널 연동 실패:", e);
    return NextResponse.redirect(`${origin}/onboarding?error=channel_connect`);
  }
}
```

- [ ] **Step 3: onboarding 페이지의 "채널 없음" 화면에서 CTA 교체**

`src/app/onboarding/page.tsx`에서 import 줄

```ts
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
```

를 삭제하고, `<GoogleSignInButton />`가 있는 블록을:

```tsx
<div className="w-full max-w-xs">
  <GoogleSignInButton />
</div>
```

이걸

```tsx
<div className="w-full max-w-xs">
  <Button
    nativeButton={false}
    render={<Link href="/channel-connect/start">유튜브 채널 연동하기</Link>}
  />
</div>
```

로 바꾼다. `Button`과 `Link`는 이 파일에 이미 import돼 있다(대시보드로 이동 버튼에서 이미
같은 패턴을 쓰고 있음 — 그대로 재사용).

- [ ] **Step 4: 사용하지 않게 된 google-sign-in-button.tsx 삭제**

```bash
rm src/components/auth/google-sign-in-button.tsx
```

- [ ] **Step 5: 타입체크 및 린트**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음 (특히 `google-sign-in-button` 관련 미해결 import 없는지 확인)

- [ ] **Step 6: 브라우저로 전체 흐름 검증**

Google Cloud Console에 `http://localhost:3000/channel-connect/callback`을 승인된 리디렉션
URI로 등록했는지 먼저 확인(위 "중요" 참고). `npm run dev` 후:
1. 로그아웃 상태에서 `/` 접속 → "카카오로 계속하기" 버튼으로 로그인
2. 로그인 성공 후 채널이 없으므로 `/onboarding`으로 이동하는지 확인
3. "유튜브 채널 연동하기" 클릭 → 구글 동의 화면으로 이동하는지 확인
4. 동의 완료 → `/dashboard`로 이동하고 채널 정보가 정상 표시되는지 확인
5. 로그아웃 후 다시 로그인 → 이번엔 채널이 있으므로 `/onboarding`을 거치지 않고 바로
   `/dashboard`로 가는지 확인

- [ ] **Step 7: 커밋**

```bash
git add src/app/channel-connect src/app/onboarding/page.tsx
git rm src/components/auth/google-sign-in-button.tsx
git commit -m "feat: 순수 구글 OAuth 채널 연동 플로우 추가, 구 로그인 버튼 제거"
```

---

## Self-Review 메모

- **스펙 커버리지**: 스펙의 "로그인 체계"(Task 1-3) · "채널 연동 흐름"(Task 4-5) 전부 태스크로
  매핑됨. 스펙의 스키마·라우트 재구성·다운그레이드 잠금 섹션은 이번 계획 범위 밖으로 명시적으로
  뺐고 실제로 어떤 태스크에도 포함하지 않음.
- **타입 일관성**: `exchangeAuthCodeForTokens`는 Task 4에서 한 번만 정의되고 Task 5가 그대로
  import해서 쓴다. `connectChannel`(기존 함수)의 시그니처(`{userId, accessToken, refreshToken}`)는
  손대지 않고 그대로 재사용.
- **범위**: 단일 서브시스템(로그인+채널연동 분리)으로 한 번의 계획에 담을 만한 크기.
