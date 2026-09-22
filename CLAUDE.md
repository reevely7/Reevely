# Reevely

유튜브 크리에이터(구독자 1만~50만, 소속사·법무팀 없는 개인/소규모)를 위한
AI 기반 악성 댓글 탐지 및 증거관리 SaaS.

## 핵심 동작 원리

1. 크리에이터가 유튜브 채널을 OAuth로 직접 연동 (스크래핑 아님, YouTube Data API v3 공식 API)
2. 서버가 API로 댓글을 가져옴 — Vercel Cron이 30분마다 전체 연동 채널을 순회하되,
   **플랜별 고정 주기**로 채널별 실제 sync 여부를 정한다: 무료 24시간, 베이직
   6시간, 플러스 1시간, 프로 30분마다 (`isSyncDue()`/`getSyncIntervalForUser()`,
   `src/lib/db/queries/channels.ts`/`subscriptions.ts`). 수동 트리거 버튼 없음,
   유튜브에 댓글 웹훅이 없어 진짜 실시간은 불가능. 대댓글 수집도 플랜별로 다름 —
   무료는 최상위 댓글만, 베이직 이상은 대댓글도 수집(`getCollectRepliesForUser()`).
3. OpenAI API가 각 댓글을 아래 JSON 구조로 판정:

```json
{
  "is_malicious": true,
  "risk_level": "high",
  "category": "명예훼손",
  "confidence": 0.85,
  "reason": "판정 근거 한 줄"
}
```

4. **confidence 0.7 미만은 자동 확정하지 않고 "검토 필요"로 분리한다.**
   오탐 관리가 이 서비스의 핵심 원칙이다.

## 확정된 기술 스택 (변경하지 말 것)

- TypeScript / Next.js (App Router) + React + Tailwind CSS, 패키지 매니저 npm
- UI: shadcn/ui
- Supabase: PostgreSQL + Auth(카카오 로그인) + Storage(증거 캡처용, 향후 단계).
  구글 OAuth는 로그인이 아니라 별도의 유튜브 채널 연동 플로우
  (`/channel-connect/start` → `/channel-connect/callback`)에서만 쓴다.
- **ORM: Drizzle** — 실제 쿼리는 전부 Drizzle로 작성한다. Supabase 기본 클라이언트는
  Auth 용도로만 쓰고 DB 쿼리에는 쓰지 않는다. (타입 안전성 + DB lock-in 방지)
- 배포: Vercel
- AI 분석: OpenAI **`gpt-4o-mini`** — `gpt-4.1-nano`와 27개 경계선 케이스로 실측 비교한
  결과, nano는 허위사실·성희롱 등 핵심 카테고리에서 미탐지가 잦아 기각함. 모델을
  바꾸려면 반드시 이런 실측 비교 후 결정할 것.
- 결제: Toss Payments 정기결제(빌링키 발급 + 매월 자동 청구, `src/lib/billing/toss-client.ts`).
  업그레이드는 즉시결제, 다운그레이드는 다음 결제일 예약, 해지 가능
  (`/api/billing/{upgrade,plan,cancel}`, `src/app/api/cron/process-billing/route.ts`).

## 데이터 접근 구조 원칙 (반드시 지킬 것)

모든 DB 접근 로직은 `src/lib/db/`에 모은다. 컴포넌트나 페이지에서 DB에 직접 접근하지
않는다. `src/lib/db/index.ts`는 `server-only`로 임포트가 강제되어 클라이언트 컴포넌트에서
실수로 가져다 쓰면 빌드 타임에 에러가 난다. 인프라 교체·확장 시 이 한 곳만 고치면 되게
하기 위함 (5년 장기 유지보수 전제).

## 이번 MVP 범위

**만드는 것**: 유튜브 채널 1개 OAuth 연동 · 댓글 가져오기 · AI 위험도/유형 판정 ·
대시보드 리스트(위험도별 색상, 판정 근거, confidence 표시) · 오탐 신고 버튼 ·
작성자별 댓글 이력 조회(`authorChannelId` 기준으로 같은 작성자가 남긴 다른 악성
댓글을 한 페이지에서 확인, `authors/[authorChannelId]`) · 요금제(무료/베이직/플러스/프로)
결제·구독 관리(Toss Payments, `mypage/subscription`) · 인앱 알림 시스템
(`notifications`, 대시보드 헤더 벨 아이콘 드롭다운. 전부 cron 분석 파이프라인
안에서 생성되고, 별도 이메일·푸시 발송은 하지 않는 인앱 전용):
  - `new_comment` — 구독한 작성자의 새 악성 댓글 (작성자 페이지 "새 댓글 알림 받기")
  - `repeat_author` — 미구독 작성자가 누적 3번째 악성 댓글을 남기면 구독 제안
  - `review_backlog` — 검토 필요 큐가 5건 이상 쌓이면
  - `video_spike` — 한 분석 배치 안에서 특정 영상에 악성 댓글 3건 이상 몰리면
  - `weekly_digest` — 주간 위험 댓글 요약 (전용 cron 없이 매시간 cron 안에서
    "마지막 생성 후 7일 지났을 때만" 실행)
  - `analysis_quota_reached` — 월 분석량 한도 도달 시 1회
  - `payment_failed` / `payment_downgraded` — 정기결제 실패, 실패 누적에 따른 강제 다운그레이드
  - `reauth_required` — 유튜브 연동 토큰 재인증이 필요할 때

관리자(admin) 전용 대시보드(`src/app/admin/`)도 별도로 존재 — 유저·채널·구독
현황, AI 판정 품질, 감사 로그, 시스템 상태 조회용 내부 도구이며 크리에이터
대상 MVP 범위 밖.

**만들지 않는 것 (나중 단계)**: 증거 PDF 생성, 삭제 요청 워크플로우,
외부 공유 링크, 인스타그램 연동, 우회표현(초성·은어) 탐지 고도화,
알림 이메일/푸시 발송(외부 서비스 연동 필요)

## DB 스키마

`comments`, `channels`, `author_subscriptions`, `notifications` 테이블 정의는
`src/lib/db/schema.ts` 참조 (실제 컬럼은 이 파일이 최신 기준).

**개인정보 최소 수집 원칙**: 댓글 작성자의 실명·구글 계정 개인정보는 절대 저장하지
않는다. 공개된 채널ID·채널 닉네임(작성자가 유튜브에 공개 설정한 표시 이름)까지만
저장한다. 이메일, 실명, 프로필 사진 등 그 외 개인정보는 저장하지 않는다.

## 보안 원칙

- API 키는 전부 `.env.local`에만, 절대 커밋 금지 (`.gitignore`에 `.env*` 포함됨)
- YouTube/OpenAI 호출 비용은 신선도 기반 폴링(위 참조) + 댓글 100개/영상, 분석
  배치당 최대 20개로 방어
- **영상 모니터링 수·월 댓글 분석량은 플랜별로 차등 적용**한다 (`src/lib/db/queries/subscriptions.ts`의
  `PLAN_VIDEO_LIMITS`/`PLAN_MONTHLY_ANALYSIS_LIMITS`, 무료는 `FREE_VIDEO_LIMIT`/`FREE_MONTHLY_ANALYSIS_LIMIT`):
  무료 10개 영상·월 1,000건, 베이직 50개·10,000건, 플러스 200개·30,000건, 프로는
  영상 수 무제한(재생목록 끝까지 페이지네이션, `src/lib/youtube/sync-comments.ts`)·월
  50,000건. 월 분석량은 유저가 연동한 채널 전체를 합산한 계정 단위 한도이며
  (`countAnalyzedCommentsThisMonthByUserId`), 도달하면 그 달은 분석을 멈추고
  `analysis_quota_reached` 알림을 1회 생성한다(`analyzePendingComments`,
  `maybeNotifyAnalysisQuotaReached`) — 안 된 댓글은 삭제되지 않고 다음 달에 이어서
  분석됨
- OpenAI 호출 시 `max_tokens: 300` 명시함 (`src/lib/ai/analyze-comment.ts`)
- 유튜브 refresh token은 반드시 암호화해서 저장, 평문 저장 금지 (`src/lib/crypto/token-cipher.ts`)

## 금지 패턴

- `any` 타입 (불가피하면 `unknown` + 타입가드)
- 프로덕션 코드에 `console.log` (에러 로깅은 `console.error`만)
- `pages/` 디렉토리 신규 파일 생성 (App Router만 사용)
- Supabase 기본 클라이언트로 직접 쿼리 (Drizzle 사용)
- 컴포넌트/페이지에서 DB 직접 접근 (`src/lib/db` 경유)

## 배포 전 체크리스트

실제로 Vercel에 배포하는 이야기가 나오면 아래를 먼저 확인할 것:

- `CRON_SECRET`을 Vercel 프로젝트 환경변수에 `.env.local`과 동일한 값으로 등록
  (안 하면 `/api/cron/process-comments`·`process-billing`·`cleanup-expired-comments`
  전부 계속 401)
- **Hobby 플랜은 cron 주기 제한이 있을 수 있음** — `vercel.json`의 30분 주기(`*/30 * * * *`)가
  실제로 지원되는지 확인, 안 되면 Pro 업그레이드 또는 주기 조정 (프로 플랜 유저의
  "30분마다" 동기화는 이 cron 주기가 상한이라, 여기서 밀리면 그만큼 늦어짐)
  - **TODO(임시 조치, 반드시 되돌릴 것)**: Hobby 플랜은 하루 1회 초과 cron을 아예
    거부(배포 자체가 Error)하기 때문에, 최초 배포를 위해 `process-comments` 스케줄을
    `*/30 * * * *`에서 `0 5 * * *`(하루 1회)로 임시 변경해둔 상태. **Pro 플랜으로
    업그레이드하면 `vercel.json`의 이 스케줄을 `*/30 * * * *`로 반드시 되돌릴 것**
    (안 그러면 프로/플러스 플랜 유저도 하루 1회 동기화로 묶여버림)
- YouTube API 쿼터는 프로젝트 전체 공유(기본 하루 10,000유닛, 채널당 sync ~11유닛) —
  프로 플랜은 영상 모니터링 수 제한이 없어(재생목록 전체 페이지네이션) 영상이 많은
  채널 하나가 쿼터를 크게 잡아먹을 수 있음. cron 주기가 30분으로 짧아진 것까지
  포함해 재계산할 것
- `.env.local`의 다른 키(Supabase, Google, OpenAI)도 전부 Vercel 환경변수에 등록

## 마이그레이션

마이그레이션 파일은 `./drizzle`에 생성된다 (`drizzle.config.ts` 기준).
`npm run db:generate` → `npm run db:migrate` 순서로 실행.

## 작업 방식

- 큰 변경은 단계별로 나눠서, 관련 파일만 읽고 최소 범위로 수정
- 방향이 불확실하면 먼저 질문하고 진행
- 커밋 전 `npx tsc --noEmit && npm run lint` 확인
- 커밋 메시지: `feat|fix|docs|refactor: 간결한 설명` (본문에 이유 포함)

## 언어

모든 응답은 한국어.

## 폴더 구조

```
src/
  app/
    (app)/c/[channelId]/                   채널별 화면 (채널 전환 시 URL의 channelId가 바뀜)
      dashboard/                            메인 대시보드
      review/                               검토 필요 큐
      authors/[authorChannelId]/            작성자별 댓글 이력·알림 구독
      notifications/                        알림 목록
      evidence-archive/                     증거 보관함
      comments/, summary/, videos/          댓글·요약·영상 관련 화면
    (app)/mypage/                           연동 해제·계정 삭제(account/), 구독/결제 관리(subscription/)
    admin/(dashboard)/                      관리자 전용 (users, channels, subscriptions, content,
                                             audit-log, system, ai-quality) — MVP 범위 밖 내부 도구
    api/cron/process-comments/route.ts     Vercel Cron 진입점 (30분마다, 플랜별 고정 sync 주기)
    api/cron/cleanup-expired-comments/route.ts  Vercel Cron (하루 1회) — 플랜별 데이터
                                            보관 기간 지난 댓글 삭제, 증거 보관함 저장분은 제외
    api/cron/process-billing/route.ts      Vercel Cron — 정기결제 청구, 실패 시 알림
    api/comments/[id]/status/route.ts      오탐 신고·검토 확정 (PATCH)
    api/comments/[id]/archive/route.ts     증거 보관함 추가/해제 (PATCH)
    api/billing/{upgrade,plan,cancel}/route.ts  플랜 즉시결제/다운그레이드 예약/해지
    api/authors/[authorChannelId]/subscription/route.ts  알림 구독 on/off (PATCH)
    api/notifications/[id]/read/route.ts   알림 읽음 처리 (PATCH)
    api/notifications/read-all/route.ts    알림 전체 읽음 처리 (PATCH)
    auth/callback/route.ts                 카카오 로그인 콜백 (세션 교환만, 채널 연동은 별도 플로우)
    channel-connect/start/route.ts         유튜브 채널 연동 시작 (구글 OAuth, CSRF state 쿠키 발급)
    channel-connect/callback/route.ts      유튜브 채널 연동 콜백 (구글 OAuth 코드 교환 후 연동)
    billing/success/, billing/fail/        Toss 결제 성공/실패 콜백
    onboarding/                            채널 연동 확인 화면
  components/
    ui/             shadcn/ui 컴포넌트
    auth/          로그인·로그아웃 버튼
    comments/       오탐 신고/검토 확정 버튼(status-action-button), 증거 보관함
                    추가/해제 버튼(archive-action-button)
    dashboard/      요약 카드, 필터, 테이블, 알림 벨(드롭다운)
    authors/        작성자별 댓글 피드(필터·내보내기·알림 구독)
    notifications/  알림 목록 행, 전체 읽음 버튼
    mypage/         플랜 액션 버튼(업그레이드/다운그레이드/해지), 결제 체크아웃 버튼
    settings/       계정 삭제 확인 버튼
    admin/          관리자 대시보드 UI
    icons/          커스텀 SVG 아이콘 (bell-icon 등)
  lib/
    db/
      index.ts       Drizzle 클라이언트 (server-only)
      schema.ts      테이블 정의
      queries/        DB 쿼리 함수 (comments, channels, notifications, subscriptions, admin-*)
    supabase/        client.ts(브라우저)/server.ts(서버)/middleware.ts — Auth
    youtube/         채널 연동, 댓글 sync, 토큰 갱신
      exchange-auth-code.ts  구글 인가 코드(code) → access/refresh 토큰 교환
    ai/              OpenAI 판정 로직
    billing/         Toss Payments 클라이언트 (빌링키 발급, 청구)
    crypto/          refresh token 암호화
  proxy.ts           세션 갱신 (Next.js 16, 구 middleware.ts)
```
