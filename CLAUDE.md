# Reevely

유튜브·인스타그램 크리에이터(구독자 1만~50만, 소속사·법무팀 없는 개인/소규모)를 위한
AI 기반 악성 댓글 탐지 및 증거관리 SaaS.

## 핵심 동작 원리

1. 크리에이터가 유튜브 채널을 OAuth로 직접 연동 (스크래핑 아님, YouTube Data API v3 공식 API)
2. 서버가 API로 댓글을 가져옴
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

- TypeScript / Next.js (App Router) + React + Tailwind CSS
- UI: shadcn/ui
- Supabase: PostgreSQL + Auth(구글 OAuth) + Storage(증거 PDF/캡처용, 향후 단계)
- **ORM: Drizzle** — 실제 쿼리는 전부 Drizzle로 작성한다. Supabase 기본 클라이언트는
  Auth/Storage 용도로만 쓰고 DB 쿼리에는 쓰지 않는다. (타입 안전성 + DB lock-in 방지)
- 배포: Vercel
- AI 분석: OpenAI API

## 데이터 접근 구조 원칙 (반드시 지킬 것)

모든 DB 접근 로직은 `src/lib/db/`에 모은다. 컴포넌트나 페이지에서 DB에 직접 접근하지
않는다. `src/lib/db/index.ts`는 `server-only`로 임포트가 강제되어 클라이언트 컴포넌트에서
실수로 가져다 쓰면 빌드 타임에 에러가 난다. 인프라 교체·확장 시 이 한 곳만 고치면 되게
하기 위함 (5년 장기 유지보수 전제).

## 이번 MVP 범위

**만드는 것**: 유튜브 채널 1개 OAuth 연동 · 댓글 가져오기 · AI 위험도/유형 판정 ·
대시보드 리스트(위험도별 색상, 판정 근거, confidence 표시) · 오탐 신고 버튼

**만들지 않는 것 (나중 단계)**: 증거 PDF 생성, 삭제 요청 워크플로우, 반복 작성자 추적,
외부 공유 링크, 인스타그램 연동, 결제/구독, 우회표현(초성·은어) 탐지 고도화

## DB 스키마

`comments` 테이블 정의는 `src/lib/db/schema.ts` 참조.

- id, user_id(→ auth.users), video_id, author_channel_id, text, risk_level,
  category, confidence, reason, status(confirmed/needs_review/reported_false/whitelisted),
  created_at, analyzed_at

**개인정보 최소 수집 원칙**: 댓글 작성자의 실명·구글 계정 개인정보는 절대 저장하지
않는다. 공개된 채널ID 정도만 저장한다.

## 보안 원칙

- API 키(OpenAI, YouTube, Supabase)는 전부 `.env.local`에 넣고 절대 커밋하지 않는다
  (`.gitignore`에 `.env*` 포함되어 있음)
- YouTube API / OpenAI API 호출 모두 유저 1인당 사용량 제한(rate limit)을 건다 —
  비용 폭탄 방지

## 폴더 구조

```
src/
  app/                유저가 보는 라우트 (App Router)
  components/ui/      shadcn/ui 컴포넌트
  lib/
    db/
      index.ts         Drizzle 클라이언트 (server-only)
      schema.ts         테이블 정의
    supabase/
      client.ts         브라우저용 Supabase 클라이언트 (Auth)
      server.ts         서버 컴포넌트/액션용 Supabase 클라이언트 (Auth)
    utils.ts            shadcn cn() 헬퍼
```
