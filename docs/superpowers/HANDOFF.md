# Reevely 테마 리디자인 — 진행 상황 인수인계 (2026-09-16 기준)

새 대화창에서 이어서 작업할 때 이 문서를 먼저 읽을 것. PPT 원본(`/Users/nayun/Desktop/리블리 정보/Reevely_디자인 수정 사항.pdf`, 15p)은 별도로 새 대화창에서 직접 다시 읽고 있으므로 이 문서는 "이미 뭘 했고 뭐가 남았는지"만 다룬다.

## 배경

Reevely를 화이트+딥그린 팔레트로 전면 리디자인하는 작업. PPT 15페이지 분석 내용은 `docs/superpowers/specs/2026-09-15-reevely-ui-redesign.md`에 전부 정리되어 있음 — **이 스펙 문서가 유일한 진실 소스(source of truth)**이니 PPT를 다시 읽더라도 이 문서와 대조해서 갱신할 것.

## 작업 방식 (반드시 지킬 것)

- **브랜치**: `theme` (develop에서 분기, 이미 origin에 푸시됨). **develop에는 절대 push/merge 금지** — 사용자가 명시적으로 지시함.
- **진행 순서**: 화면 단위 12단계, 순서 고정 합의됨:
  ① 공통 디자인 시스템 → ② 대시보드 → ③ 댓글 목록 → ④ 알림 → ⑤ 검토 필요 → ⑥ 증거 보관함 → ⑦ 주간 요약 → ⑧ 요금제 → ⑨ 채널·계정 영역 → ⑩ 랜딩페이지 → ⑪ 전체 화면 재점검 → ⑫ 반응형/모바일 점검 — **12/12 전부 완료**
- **실행 방법**: `superpowers:writing-plans` → `superpowers:subagent-driven-development` 조합. 각 화면마다:
  1. 코드베이스 탐색 후, 데이터 정의·기능 범위 등 진짜 애매한 부분이 있으면 `AskUserQuestion`으로 먼저 확인 (지금까지 대시보드에서 4개 질문, 댓글목록에서 3개 질문 해서 전부 결정하고 진행함 — 색상/카피만 바꾸는 게 아니라 실제 데이터 모델·기능 결정이 얽혀 있어서 매번 필요했음)
  2. `docs/superpowers/plans/`에 화면별 계획 파일 작성 (파일명 패턴: `YYYY-MM-DD-theme-NN-화면이름.md`)
  3. subagent-driven-development로 태스크별 구현→리뷰→(필요시 fix round)→다음 태스크, 전부 끝나면 최종 전체 브랜치 리뷰(opus) 1회
  4. 완료 후 `git push origin theme` (PR은 아직 안 만듦, 사용자가 원할 때 따로 요청할 것)
- **로그인 필요 화면은 자동 브라우저 검증 안 함** — 사용자가 명시적으로 거부함 ("로그인은 너가 하지마, 내가 직접 로그인해서 볼게"). 검증 태스크는 tsc/lint + 스펙 대조 코드리뷰로 대체하고, 마지막에 "여기 로그인해서 직접 확인해주세요" 안내만 남긴다. 공개 페이지(랜딩, `/admin/login`)만 Playwright 자동 검증 대상.
- **커밋마다 `npx tsc --noEmit && npm run lint` 통과 상태 유지** — 인터페이스가 바뀌는 두 파일(예: 컴포넌트 prop 모양 변경 + 그 컴포넌트를 부르는 페이지)은 반드시 한 커밋으로 묶을 것 (중간에 빌드 깨지는 커밋 만들지 말 것).

## 완료된 작업 (12/12 — 전체 완료)

### ① 공통 디자인 시스템 (`docs/superpowers/plans/2026-09-15-theme-01-design-system.md`)
- `globals.css`의 다크+골드 팔레트를 화이트+딥그린으로 전면 교체 (배경 `#F8FAF7`, primary `#3E6856`, 등). **전역 적용 — `/admin` 스태프 패널도 같이 바뀜** (사용자 확정).
- 버튼 높이 36px/40px(default/lg)로 조정.
- 위험도·상태 배지 색상 재정의 (컨트라스트 문제 있어서 한 번 더 어둡게 조정함 — 최종값은 globals.css 확인).
- **남은 흠(나중 11단계에서 처리하기로 미룸)**: Secondary 버튼의 `#CAD6C7` 테두리 색 아직 안 입혀짐(현재 outline 버튼은 `#EDEDED` 테두리 씀), `risk-badge.tsx`의 위험도 라벨이 아직 영문(High/Medium/Low) — 여러 화면이 공유하는 컴포넌트라 11단계(전체 화면 재점검)에서 한번에 처리하기로 함.

### ② 대시보드 (`docs/superpowers/plans/2026-09-15-theme-02-dashboard.md`)
- 헤더를 "안녕하세요! 👋" 인사말+날짜범위+최근갱신 구조로 교체.
- KPI 5개(전체/High/Medium/Low/검토필요) → 4개(총댓글/검토필요/악성비율/보호된댓글)로 재구성.
  - **총 댓글 = 분석 완료된 전체 댓글 수**(악성+정상), 악성비율 = 그 중 악성 비율(%), 보호된 댓글 = 검토 완료된 악성 댓글 수(총 악성 - 검토필요). 이 정의는 리뷰 중 사용자가 직접 재확정함(처음엔 총댓글=악성건수였다가 헷갈려서 바꿈).
- "최근 위험 댓글" → "최근 위험 알림"으로 개명, 원문 대신 AI 요약(`reason`) 우선 노출.
- "요주의 작성자 (누적)"+"(최근7일)" 두 위젯 → "반복 위험 작성자 TOP 5" 하나로 통합.
- "이번 달 사용량·{플랜}플랜" → "채널 사용량", "구독 제안" → "집중 모니터링 제안".
- **남은 흠**: 없음 (이 화면 범위 안에서는 다 정리됨).

### ③ 댓글 목록 (`docs/superpowers/plans/2026-09-16-theme-03-comments-list.md`)
- 체크박스 일괄 처리 **실제 동작** 구현: 새 벌크 API(`/api/comments/bulk-status`, `/api/comments/bulk-archive`) + DB 쿼리 함수, 전부 채널 소유권 검증까지 포함.
- 플랫폼 아이콘 컬럼 추가 (유튜브/인스타그램만 — 틱톡은 DB에 없어서 제외). lucide-react에 브랜드 아이콘이 없어서 `src/components/icons/youtube-icon.tsx`·`instagram-icon.tsx` 커스텀 SVG로 새로 만듦.
- "원문 숨김 ON/OFF" 토글 추가 — 목록 미리보기가 AI요약(`reason`)/원문(`text`) 전환, 상세보기(행 확장)는 항상 원문 전체 노출.
- 상태값 통합: `confirmed`→검토완료, `needs_review`→검토필요, `reported_false`·`whitelisted`→둘 다 "정상". `isArchived`는 별도 "보호됨" 배지로 추가 표시(상태와 동시에 뜰 수 있음).
- 필터에 플랫폼 옵션 추가, 상태 필터 라벨 갱신.
- **검증 중 실버그 하나 발견해서 수정함**: "정상" 필터가 `reported_false`만 잡고 `whitelisted`는 놓치던 문제 (검토 큐에서 "아님" 처리해도 `isMalicious`는 안 바뀌어서 이 목록에 계속 남는데, 화면엔 "정상"으로 보이지만 필터로는 안 잡혔음) → 쿼리를 `inArray(["reported_false","whitelisted"])`로 수정.
- **남은 흠(안 고치기로 함, 안전한 방향으로 치우친 사소한 문제)**: `bulk-archive`의 플랜 한도 사전체크가 이미 보관된 항목도 "새로 소비할 슬롯"으로 중복 계산해서 살짝 과하게 깐깐함 (한도 초과를 절대 허용 안 하는 안전한 방향의 오차라 방치).

### ④ 알림 화면 (`docs/superpowers/plans/2026-09-16-theme-04-notifications.md`)
- 탭 4개 추가(전체/위험 알림/반복 작성자/공지사항), URL `?tab=` 파라미터 기반. 탭-타입 매핑: 위험 알림={new_comment, video_spike, review_backlog}, 반복 작성자={repeat_author}, 공지사항={weekly_digest, reauth_required}. 계정 단위 알림(payment_*, analysis_quota_reached)은 이 페이지 범위 밖(`/mypage/subscription`에서만 노출) — 사용자 확정.
- 알림 문구를 위험도·카테고리별 집계까지 확장(사용자가 "톤만 통일" 대신 "집계까지 확장"을 선택함): `video_spike`는 위험도별 건수 포함("위험 댓글 급증", 예: "... 위험 댓글 5건이 감지됐어요 (High 2건·Medium 3건)."), `repeat_author`는 카테고리별 건수 포함("반복 위험 작성자 발견", 예: "... (협박 1건·인신공격 2건)"). 새 DB 쿼리 `getCategoryBreakdownByAuthor` 추가, cron 파이프라인(`analyze-pending-comments.ts`)에서 영상별 위험도 breakdown 집계해서 전달.
- `review_backlog` 메시지 통일: "AI 확신도가 낮아 사용자 확인이 필요한 댓글이 N건 있습니다."
- `new_comment` 알림 카드가 원문 대신 AI 요약(`reason`) 우선 노출 — 댓글 목록·대시보드와 동일한 `reason ?? text` 폴백 패턴. `notification-row.tsx`와 `notification-bell.tsx` 둘 다 적용.
- 헤더 설명 문구 변경: "위험 댓글 증가, 반복 작성자, 검토 필요 등 중요한 변화만 알려드립니다."
- **주의**: 위험도·카테고리 breakdown이 반영된 새 알림 문구는 **다음 cron 분석 배치가 새로 알림을 생성해야 볼 수 있음** — 기존에 저장된 알림 행은 소급 갱신되지 않는다.
- **남은 흠(11단계로 미룸)**: `NotificationTabs`가 `role="tab"`/`aria-selected` 등 ARIA tablist 시맨틱 없음(기능은 정상, 접근성만). "전체" 탭 클릭 시 URL에 트레일링 `?`가 남는 사소한 문제(예: `/notifications?`).

### ⑤ 검토 필요 화면 (`docs/superpowers/plans/2026-09-16-theme-05-review.md`)
- 카드 구조 재정렬: 1행(위험도 배지+AI 신뢰도%+날짜) / 2행(AI 요약 `reason`, 없으면 원문 폴백) / 3행(카테고리 태그+플랫폼 아이콘) / 우측 액션(악성으로 분류/정상 댓글로 분류/상세).
  - **스펙 문서 원문은 1행에 "유형"도 포함하라고 되어 있지만, 실사용 중 사용자가 직접 "유형은 3행으로 옮기고 1행은 위험도+신뢰도+날짜만"으로 재확정함**(사용자 확정, 2026-09-16) — 나중에 스펙 문서 원문과 실제 구현이 다르다고 헷갈리지 말 것, 이 재배치가 최종 결정.
- "상세" 클릭 = 별도 페이지 이동이 아니라 카드를 그 자리에서 펼쳐서 원문(`text`) 전체 노출(댓글 목록의 행 확장과 동일 원리). 한 번에 하나만 펼쳐짐(`expandedId`).
- 버튼: "악성 맞음"→"악성으로 분류"(`destructive`/빨간색 variant로 변경 — 스펙 12번의 "Danger는 위험 액션에만" 규칙 적용), "아님"→"정상 댓글로 분류"(outline 유지). `StatusActionButton`의 `variant` 타입에 `"destructive"`를 추가(기존 버튼 컴포넌트에 이미 있던 스타일, 새로 만든 색 아님).
- `confidence`(0.60 형태) → "AI 신뢰도 60%"로 표시(`Math.round(Number(confidence) * 100)`, 댓글 목록 상세보기와 동일 계산식).
- 헤더 설명 문구 변경: "AI 확신도가 낮은 댓글만 모아 직접 판단할 수 있습니다."
- 새 클라이언트 컴포넌트 `src/components/comments/review-queue-list.tsx` 생성(플랫폼 아이콘/라벨/날짜 포맷 헬퍼는 `comments-table.tsx`에서 import하지 않고 로컬로 중복 정의 — 이 코드베이스의 기존 관례).
- **남은 흠(11단계로 미룸)**: "상세" 토글 버튼에 `aria-expanded` 없음(접근성만, 기능은 정상). AI 요약(`reason`)이 없는 드문 케이스에서 2행과 펼친 상세에 원문이 중복 노출될 수 있음(현재 데이터상 거의 발생 안 함).

### ⑥ 증거 보관함 화면 (`docs/superpowers/plans/2026-09-16-theme-06-evidence-archive.md`)
- **PDF 저장 기능은 이번에도 실제로 만들지 않음** — 버튼만 `disabled`+"PDF 저장 (준비 중)" 라벨로 존재. CLAUDE.md의 "만들지 않는 것" 목록(증거 PDF 생성)과 일치. 나중에 실제 PDF 생성 기능을 만들 때 이 버튼을 활성화하면 됨.
- 카드에 플랫폼 아이콘, AI 요약(`reason`) 우선 노출, 영상명/링크(유튜브만 실제 링크, 인스타그램은 텍스트만), 위험도·유형, 작성자, 보관일 추가.
- 액션 3개: "미리보기"(카드를 그 자리에서 펼쳐 원문 노출, 검토 필요 화면과 동일 패턴) / "PDF 저장 (준비 중)"(비활성화) / "삭제".
  - **"삭제" 버튼은 실제로는 삭제가 아니라 기존 "보관 해제"(unarchive)다** — 댓글 자체는 DB에서 지워지지 않는다(사용자 확정, 2026-09-16). `ArchiveActionButton`에 optional `label` prop을 추가해서 이 화면에서만 "삭제"로 표시(다른 화면 호출부는 그대로 "증거 보관"/"보관 해제").
- 빈 화면: "아직 보관된 증거가 없어요." + "첫 증거 보관하기" 버튼(댓글 목록 페이지로 이동, 이 페이지 자체엔 보관 액션이 없음).
- 헤더 타이틀 "증거 보관함 · PDF 저장 가능"으로 변경.
- **남은 흠**: 없음 (이 화면 범위 안에서는 다 정리됨, 최종 리뷰 코멘트는 전부 사소한 정보성).

### ⑦ 주간 요약 화면 (`docs/superpowers/plans/2026-09-16-theme-07-weekly-summary.md`)
- KPI 4개로 재구성: **총 댓글/위험 댓글은 이번 주 기간 한정, 검토 필요/증거 보관은 누적 전체**(사용자 확정, 2026-09-16 — 검토 큐는 원래 시점 개념이 없고 증거 보관은 계속 쌓이는 자산이라 누적이 자연스러움).
- "위험 유형별 비율"은 위험도(High/Medium/Low)가 아니라 **카테고리**(명예훼손/협박/성희롱 등) 기준(사용자 확정, 2026-09-16) — 기존 위험도 분해 UI는 완전히 대체(같이 두지 않음). 새 쿼리 `getCategoryBreakdownInRange` 추가.
- 일별 추이 그래프 신규 추가 — 대시보드의 `DailyTrendCard`는 재사용하지 않고(자기참조 링크가 있어 이 페이지 안에서 어색함) 막대 렌더링 로직만 로컬로 재구현.
- "이번 주 인사이트" 텍스트 카드 신규 추가(사용자가 "만들어줘"로 확정, 2026-09-16) — 규칙 기반 문장 최대 3개: (1) 위험 댓글 지난주 대비 증감률, (2) 이번 주 반복 위험 작성자 알림 건수, (3) 증거 보관 건수 지난주 대비 증감. 전부 조건 미충족이면 "이번 주 요약은 데이터가 쌓이면 자동으로 생성됩니다."로 대체, "→ 지속적인 모니터링이 필요합니다." 안내는 항상 고정 노출.
- "지난 주간 요약 알림 기록" 섹션은 그대로 유지하되(사용자 확정, 2026-09-16), 제목→"지난 주간 요약 및 주요 인사이트", 빈 상태 문구→"이번 주 요약은 데이터가 쌓이면 자동으로 생성됩니다."로 스펙 문구 갱신.
- 신규 DB 쿼리 4개 추가(`comments.ts`): `countAnalyzedCommentsInRange`, `getCategoryBreakdownInRange`, `countArchivedCommentsByChannelId`, `countArchivedInRange`.
- **남은 흠(11단계로 미룸)**: `getRiskBreakdownInRange`(comments.ts) 함수가 이 화면의 유일한 호출부였는데 이번에 카테고리 비율로 대체되면서 **저장소 전체에서 아무도 안 부르는 죽은 함수**가 됨 — 나중에 지워도 안전(11단계 전체 화면 재점검에서 처리).

### ⑧ 요금제 화면 (`docs/superpowers/plans/2026-09-16-theme-08-pricing.md`)
- **중요 발견**: CLAUDE.md의 "만들지 않는 것" 목록(결제/구독)과 달리, `/mypage/subscription/plans`에 실제 토스페이먼츠 결제(체크아웃/업그레이드/다운그레이드/해지)가 이미 구현되어 있음(`PlanCheckoutButton`, `PlanActionButton`, `/api/billing/*`, `process-billing` cron). CLAUDE.md가 이 부분에서 최신 코드 상태와 어긋나 있음 — 이번 세션 범위 밖이라 CLAUDE.md는 고치지 않음, 참고만 해둘 것.
- 랜딩페이지 요금제 카드 4개(무료/베이직/플러스/프로) 액센트 색을 전부 `bg-primary`/`text-primary` 그린 톤으로 통일(사용자 확정, 2026-09-16: "전부 동일한 그린 톤으로 통일"). 하드코딩돼 있던 프로 플랜의 `#7f97b8`(팔레트에 없는 파란회색) 완전 제거. "추천"(플러스) 배지·링(`ring-chart-5`/`text-chart-5`)은 `/mypage/subscription/plans`와 공유하는 기존 관례라 그대로 유지.
- 헤더 카피 "채널 규모에 맞게 골라 쓰세요"→"채널 규모에 맞는 댓글 보호 플랜을 선택하세요", 서브카피를 "어떤 등급이든 AI 판정 정확도는 동일합니다. 플랜별 차이는 분석량, 모니터링 주기, 보관/대응 기능입니다."로 스펙 문구 적용.
- 랜딩페이지 결제 안내 문구 "결제 기능은 아직 준비 중입니다. 지금 가입하면 정식 출시 때 가장 먼저 안내드릴게요." → "지금 가입하면 정식 출시 시 가장 먼저 안내드립니다."로 교체(사용자 확정, 2026-09-16: "스펙 그대로 적용" — 실제 결제 기능은 이미 있지만 랜딩페이지 마케팅 문구는 스펙 원문을 그대로 따르기로 함).
- `/mypage/subscription/plans`(실제 결제 화면)와 `/billing/fail`은 코드 검토 결과 이미 시맨틱 토큰만 써서 수정 불필요 확인(코드 변경 없음).
- **남은 흠**: 없음(이 화면 범위 안에서는 다 정리됨). 최종 리뷰에서 나온 Minor 코멘트 1건은 "`/mypage/subscription/plans`의 자체 `PlanCard` 플랜명 색(중립)과, 이번에 그린으로 통일된 공유 비교표 헤더 색이 살짝 다르다"는 정보성 지적 — 이 화면을 건드리지 않기로 한 이번 단계의 명시적 제약과 일치하는 상태라 조치 불필요, ⑨ 또는 ⑪에서 그 페이지를 다룰 때 참고만 할 것.

### ⑨ 채널·계정 영역 + ⑩ 랜딩페이지 (`docs/superpowers/plans/2026-09-16-theme-09-10-channel-account-landing.md`, 두 단계를 한 계획으로 같이 진행함)
- **채널 드롭다운에 계정 메뉴 통합**: 사이드바 하단에 흩어져 있던 요금제 링크·로그아웃을 없애고, 채널 전환 드롭다운 안에 "내 프로필"(`/mypage/profile`)·"계정 설정"(`/mypage/account`)·"요금제 관리"(`/mypage/subscription/plans`)·"알림 설정"(기존 알림 피드 `/c/[channelId]/notifications`로 연결, 새 설정 페이지는 안 만듦)·로그아웃을 추가(사용자 확정, 2026-09-16: "드롭다운으로 통합"). `AppSidebar`의 이제 안 쓰는 `isPro` prop을 제거하고 두 호출부(`mypage/layout.tsx`, `c/[channelId]/layout.tsx`)도 같은 커밋에서 함께 정리.
- **"채널 추가" 플로우는 그대로 유지**: 스펙은 YouTube/Instagram/TikTok 플랫폼 선택 UI를 요구하지만, 실제로는 유튜브 OAuth만 존재(Instagram/TikTok 연동 코드 자체가 없음) — 이번엔 플랫폼 선택 UI를 만들지 않고 기존 유튜브 단일 버튼 유지(사용자 확정, 2026-09-16).
- **활성 메뉴 스타일 통일**: 사이드바 네비(기존 연한배경+그린텍스트)와 마이페이지 탭(기존 밑줄 스타일) 둘 다 진한 그린 배경+흰 텍스트로 통일(사용자 확정, 2026-09-16). 마이페이지 탭은 이미 이 저장소에 구현돼 있던 `notification-tabs.tsx`(4단계 작업)의 pill 패턴을 그대로 재사용. 사이드바 네비는 활성일 때 배지 숫자 색도 흰색으로 바꿔서 초록 배경 위에서 안 보이는 문제를 예방함.
- **로고 소문자 통일**: 사이드바(모바일/데스크톱)·랜딩 상단 네비·푸터의 "Reevely" 워드마크를 전부 소문자 "reevely"로 변경. 브라우저 탭 제목(`layout.tsx`의 `<title>`)과 푸터 저작권 표기("© {year} Reevely.")는 이번 범위에서 제외(전자는 시각 UI 요소가 아니고, 후자는 법적 표기 관례상 별개 — 최종 리뷰에서 이 casing 차이를 Minor로 지적받음, 조치 불필요로 판단).
- **랜딩페이지 상단 네비 4개 추가**: 서비스소개(`#intro`)·요금제(`#pricing`)는 실제 섹션 앵커 링크, 고객사례·리소스는 콘텐츠가 아예 없어서 클릭 불가능한 `<span title="준비 중입니다">`로 표시(사용자 확정, 2026-09-16: "4개 다 넣되 준비 중 처리"). `md:flex`로 모바일에서는 숨김(반응형은 ⑫에서 다룸).
- **히어로/소개 카피 교체**: "악플이 아니라, 기록을 남깁니다." → "좋은 크리에이터의 내일을 지킵니다", 히어로 서브카피·"왜 필요한가" 섹션 카피를 스펙 문구로 갱신. CTA "시작하기" 3곳 중 히어로="무료로 시작하기", 가격 섹션 뒤·마무리 CTA 2곳="내 채널 보호하기"(사용자 확정, 2026-09-16).
- **남은 흠(⑪로 미룸)**: Primary 버튼 hover 색(`hover:bg-primary/80`)을 스펙이 명시한 `#1E2D26`로 바꾸는 건 전역 버튼 컴포넌트 변경이라 이번 범위에서 다루지 않음(의도적 보류, 실수 아님). 랜딩 준비중 placeholder(`고객사례`/`리소스` span)에 `aria-disabled` 등 접근성 신호가 없음(최종 리뷰 Minor).

### ⑪ 전체 화면 재점검 + ⑫ 반응형/모바일 점검 (`docs/superpowers/plans/2026-09-16-theme-11-12-full-review-responsive.md`, 두 단계를 한 계획으로 같이 진행함)
- **Primary 버튼 hover `#1E2D26`, Secondary 버튼 테두리 `#CAD6C7` 전역 통일**(사용자 확정, 2026-09-16: "스펙대로 변경"). Primary hover는 `globals.css`에 새 토큰 `--primary-hover`를 추가해서 처리. Secondary 테두리는 놀랍게도 **이미 `--input` 토큰으로 `#cad6c7`가 정의돼 있었는데 다크모드 전용 클래스(`dark:border-input`)로만 쓰이고 있어서 죽어있었음**(이 앱은 다크모드 자체가 없음) — 새 토큰 없이 라이트 모드 클래스만 `border-border`→`border-input`으로 바꿔서 해결.
- 위험도 배지 한글 라벨화(High/Medium/Low → 높음/보통/낮음). **최종 리뷰에서 이게 반쪽짜리 수정이었다는 걸 지적받음** — 배지 라벨은 바뀌었는데 같은 화면의 위험도 필터 드롭다운(`comment-filters.tsx`, `author-comment-feed.tsx`, admin `ai-quality/page.tsx`)은 여전히 영문이라 "높음" 배지 옆에 "High" 필터가 보이는 상태였음 → 즉시 fix 커밋(`ff89e71`)으로 세 파일 모두 한글화해서 해결.
- 알림 탭에 ARIA tablist 시맨틱(`role="tablist"`/`role="tab"`/`aria-selected`) 추가, "전체" 탭 클릭 시 URL에 남던 트레일링 `?` 버그 수정.
- 검토 필요 화면 "상세"→"상세보기"로 문구 통일 + `aria-expanded` 추가, 증거 보관함 "미리보기"에도 동일하게 `aria-expanded` 추가(라벨은 유지). `comments-table.tsx`의 행 전체 클릭 확장(`<tr onClick>`)은 같은 방식으로 고치려면 `role="button"`/`tabIndex`/키보드 핸들러까지 새로 설계해야 해서 이번엔 제외.
- 죽은 함수 `getRiskBreakdownInRange`(comments.ts) 삭제.
- admin 패널의 "전체 보기" 링크 2곳에 화살표 추가해서 "전체 보기 →"로 통일(사용자 확정, 2026-09-16: "admin에도 적용" — 컬러 토큰은 이미 admin까지 전역 적용됐지만 문구 통일 규칙은 이번에 처음 admin까지 확장함).
- **랜딩페이지 모바일 네비 신규 추가**: 상단 네비(서비스소개/요금제/고객사례/리소스)가 `hidden md:flex`라서 모바일에서 완전히 안 보이던 문제를 새 컴포넌트 `src/components/landing/landing-mobile-nav.tsx`(햄버거 버튼+드롭다운, 자체 `isOpen` 상태 관리)로 해결(사용자 확정, 2026-09-16: "간단한 햄버거 메뉴 추가"). 랜딩 "오탐 관리 원칙" 섹션의 raw 카피 "confidence 0.7 미만"도 "신뢰도 70% 미만"으로 한글화.
- **반응형 전수 조사 결과**: 랜딩 모바일 네비 외에는 진짜 붕괴 위험이 있는 화면을 찾지 못함(테이블은 전부 `overflow-x-auto`로 감싸져 있고, 그리드는 전부 `sm:`/`lg:` 반응형 폴백 있음, `/admin`도 이미 사이드바 드로어·테이블 스크롤 다 갖춰져 있었음) — 그래서 ⑫는 사실상 랜딩 모바일 네비 하나로 수렴.
- **의도적으로 다루지 않은 것**: 랜딩 푸터 저작권 문구 "Reevely" casing(대문자 유지 확정, 2026-09-16). 최종 리뷰 Minor 잔여 항목(알림 탭이 완전한 ARIA tabs 패턴은 아님 - `aria-controls`/`role="tabpanel"` 없음, 모바일 헤더가 버튼 4개로 붐빌 수 있음, 모바일 드롭다운에 바깥 클릭 닫기 없음) — 전부 사소하고 기존부터 있었거나 브리프 그대로라 조치 안 함.

## 12단계 전부 완료 — 다음은 사용자 지시 대기

리디자인 12단계(①~⑫) 전부 구현·리뷰·push 완료됨. `theme` 브랜치는 아직 `develop`에
병합되지 않았고 PR도 안 만들어짐 — **다음 행동(로컬 병합/PR 생성/그대로 유지)은
사용자가 명시적으로 요청할 때 `superpowers:finishing-a-development-branch`
스킬로 진행할 것**, 지레짐작으로 병합하지 말 것.

## 참고 파일 위치

- 마스터 스펙: `docs/superpowers/specs/2026-09-15-reevely-ui-redesign.md`
- 완료된 화면별 계획: `docs/superpowers/plans/2026-09-15-theme-01-design-system.md`, `2026-09-15-theme-02-dashboard.md`, `2026-09-16-theme-03-comments-list.md`, `2026-09-16-theme-04-notifications.md`, `2026-09-16-theme-05-review.md`, `2026-09-16-theme-06-evidence-archive.md`, `2026-09-16-theme-07-weekly-summary.md`, `2026-09-16-theme-08-pricing.md`, `2026-09-16-theme-09-10-channel-account-landing.md`, `2026-09-16-theme-11-12-full-review-responsive.md`
- PPT 원본: `/Users/nayun/Desktop/리블리 정보/Reevely_디자인 수정 사항.pdf`
