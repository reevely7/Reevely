# Reevely 멀티 채널 지원 + 로그인 체계 분리 설계

## 배경 및 목적

요금제별 "유튜브 연동 개수" 한도(무료 1개 / 베이직 1개 / 플러스 2개 / 프로 3개, `src/app/page.tsx`의
`PLAN_FEATURES` 참조)를 실제로 구현하려면 유저당 채널을 여러 개 연동할 수 있어야 한다. 그런데
지금 구조는 두 가지가 근본적으로 유저당 채널 1개를 전제한다:

1. **DB**: `channels` 테이블에 `unique(userId, platform)` 제약이 있어 채널이 정확히 1개만 된다.
2. **로그인**: Reevely 로그인 자체가 Supabase의 "구글로 로그인"이고, 채널 연동도 그 OAuth
   응답에서 얻은 토큰을 그대로 쓴다. 즉 **로그인 정체성과 채널 연동이 한 몸**이다. 이 상태로
   두 번째 채널을 다른 구글 계정으로 연동하려고 하면, 채널이 추가되는 게 아니라 **Supabase가
   그 구글 계정을 새 로그인 정체성으로 취급해 다른 Reevely 계정으로 로그인**될 위험이 크다
   (한 구글 계정이 관리하는 여러 브랜드 채널을 API로 나열하는 공식적인 방법도 불확실함 —
   `channels.list?mine=true`가 브랜드 채널을 배열로 주는지, OAuth 동의 화면에서 이미 고른
   채널 하나만 오는지 문서상 애매함).

그래서 이번 설계는 두 가지를 함께 다룬다: **로그인 체계를 카카오로 바꿔 채널 연동과 분리**하고,
그 위에 **멀티 채널 스키마·라우트·다운그레이드 잠금**을 얹는다. 로그인을 분리하면 "한 구글
계정의 브랜드 채널 나열" 문제 자체가 사라진다 — 채널 연동은 항상 순수 구글 OAuth를 새로
띄우는 동일한 흐름이고, 유저가 그 동의 화면에서 어떤 구글 계정/채널을 고르든 상관없다.

## 범위

### 포함

- 로그인을 카카오(Supabase Auth Kakao 프로바이더)로 교체, 기존 구글 로그인 제거
- 채널 연동을 Supabase 세션과 무관한 순수 구글 OAuth 2.0으로 분리 (최초 연동 = 추가 연동, 동일 흐름)
- `channels`/`comments`/`notifications`/`author_subscriptions` 스키마에 멀티 채널 반영
- 채널 종속 페이지를 `/c/[channelId]/...`로 재구성, 사이드바 채널 전환 UI
- 플랜 다운그레이드 시 초과 채널 읽기전용 잠금
- cron이 `active` 상태 채널만 순회하도록 필터

### 제외

- 월 댓글 분석량·업데이트 주기 등 나머지 플랜 한도 강제 (별도 스펙)
- 기존 계정 마이그레이션 (아직 실유저 없어서 불필요 — 신경 안 씀)
- 카카오에서 받아오는 프로필 정보 확장 (닉네임 정도만, CLAUDE.md 개인정보 최소 수집 원칙 유지)

## 로그인 체계

- `GoogleSignInButton` → `KakaoSignInButton`으로 교체 (`supabase.auth.signInWithOAuth({provider:"kakao"})`)
- Supabase 대시보드에 Kakao 프로바이더 등록 필요(REST API 키=client_id, Kakao Login Client
  Secret=client_secret, 리다이렉트 URI `https://<project-ref>.supabase.co/auth/v1/callback`)
- `src/app/auth/callback/route.ts`에서 더 이상 `connectChannel`을 같이 호출하지 않는다 — 순수
  로그인 세션 생성만 담당하도록 단순화

## 채널 연동 흐름 (최초 = 추가, 동일)

1. "채널 추가" 버튼(사이드바 또는 `/onboarding`) → 서버가 구글 OAuth URL을 직접 구성해 리다이렉트
   (`accounts.google.com/o/oauth2/v2/auth`, `scope=https://www.googleapis.com/auth/youtube.force-ssl`,
   `access_type=offline`, `prompt=consent`) — Supabase를 거치지 않는다
2. 구글 동의 화면에서 유저가 계정/채널을 고르고 승인
3. 콜백 라우트가 인가 코드를 토큰으로 교환(`src/lib/youtube/refresh-access-token.ts`와 같은 raw
   fetch 패턴으로 신규 구현, `POST https://oauth2.googleapis.com/token` with `grant_type=authorization_code`)
4. 서버에서 **플랜 한도 재확인**(클라이언트 표시와 별개로 최종 방어선) → 통과하면 유튜브 채널
   정보 조회 + refresh token 암호화 저장 → `channels` row insert (`status="active"`)
5. 이미 연동된 `youtubeChannelId`면 중복 연동으로 막는다

## 스키마

```ts
// channels
// 기존: unique(userId, platform)
// 변경: unique(userId, youtubeChannelId) — 같은 채널 중복 연동만 막고 개수는 제한 안 함
export const channelStatusEnum = pgEnum("channel_status", ["active", "locked"]);
// channels 테이블에 추가:
status: channelStatusEnum("status").notNull().default("active"),

// comments, notifications, author_subscriptions에 공통 추가:
channelId: uuid("channel_id").notNull(),
// author_subscriptions의 unique(userId, authorChannelId) → unique(channelId, authorChannelId)로 변경
```

기존 row 백필은 하지 않는다(실유저 없음 — 필요하면 마이그레이션 시점에 테이블을 비우고 새로
시작).

## 라우트 재구성

- 채널 종속: `dashboard`, `comments`, `review`, `summary`, `evidence-archive`, `authors/[authorChannelId]`,
  `notifications` → 전부 `src/app/(app)/c/[channelId]/...` 하위로 이동
- 계정 종속: `mypage/*`는 그대로 `src/app/(app)/mypage/...` 유지. 단 `mypage/account`의
  "채널 연동 해제"는 지금은 단일 채널 전제로 짜여 있어(`disconnectChannel`이 유저의 유일한
  채널을 지움) — 연동된 채널 목록을 보여주고 채널별로 개별 해제하는 형태로 바뀌어야 한다
- 로그인 직후 리다이렉트: `active` 채널이 있으면 `/c/{생성일 가장 오래된 active 채널}/dashboard`,
  하나도 없으면 `/onboarding`
- 헤더 알림벨: 현재 URL의 `channelId` 기준으로 그 채널 알림만 표시
- 사이드바: 연동된 채널 목록 + 전환 UI, `locked` 채널은 잠금 아이콘 + 업그레이드 유도 문구로
  표시(클릭해도 대시보드 진입은 되지만 "새 데이터 없음" 안내)

## 다운그레이드 잠금

플랜이 다운그레이드되어 연동 채널 수가 새 한도를 넘으면, `createdAt` 오름차순으로 한도
개수만큼만 `active` 유지, 나머지는 `status="locked"`로 전환 (채널 자체는 삭제하지 않음 — 데이터
보존, 업그레이드하면 바로 복구).

## cron 변경

`src/lib/db/queries/channels.ts`의 `getAllChannels()`가 `status="active"`인 채널만 반환하도록
필터 추가. 그 외 sync/분석 로직은 이미 채널 row 단위로 도는 구조라 추가 변경 불필요.
