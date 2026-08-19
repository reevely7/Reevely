# Reevely 다크 톤 리디자인

## 배경 및 목적

현재 Reevely는 네이비/스틸블루/라이트블루그레이/크림 팔레트에 크림 배경(라이트 기본)을 쓰고 있다. 사용자 피드백:

- 색상이 촌스럽고 브랜드 느낌이 안 산다
- 전체 구조(대시보드 배치 등)가 정리되지 않은 느낌
- 화이트모드보다 다크모드 느낌을 원함 — 단, 화려하지 않고 눈이 편한 톤
- "저퀄리티 프로젝트" 인상을 벗어나 상용 SaaS 수준의 구조·배치가 필요

브레인스토밍 과정에서 Notion/Attio를 참고 삼아 실제 목업(브라우저 companion)으로 색·카드 형태·레이아웃·타이포그래피를 순서대로 비교하며 아래 방향으로 확정했다.

## 목표

- 다크 전용 팔레트로 전면 전환 (라이트모드 완전 삭제)
- 촌스럽지 않고 눈이 편한, 절제된 색 구성
- 테두리 위주의 "딱딱한 박스" 대신 배경색 차이로 구분되는 부드러운 카드 구조
- 대시보드에 상단 요약 통계 스트립 유지 + 그 아래 카드 리스트
- 로그인·온보딩·대시보드·검토·설정 전 화면에 일관 적용

## 비목표

- 새 기능 추가, 데이터 모델/API 변경 없음 (순수 시각적·구조적 리디자인)
- 정보 구조(어떤 페이지가 있는지, 라우팅) 자체는 바꾸지 않음 — 화면 내부 배치·톤만 재설계
- 우회표현 탐지 등 기존 CLAUDE.md상 "만들지 않는 것"은 그대로 범위 밖

## 컬러 시스템

라이트/다크 분기를 없애고 `:root`에 아래 값 하나만 남긴다 (`.dark` 클래스, `@custom-variant dark` 제거).

| 토큰 | 값 | 용도 |
|---|---|---|
| `--background` | `#0B0E14` | 페이지 배경 (거의 블랙에 가까운 슬레이트) |
| `--foreground` | `#F2F3F7` | 기본 텍스트 |
| `--card` / `--popover` | `#141822` | 카드·팝오버 표면 (테두리 없이 배경보다 밝은 톤으로 구분) |
| `--sidebar` | `#0E1218` | 사이드바 (배경보다 미세하게 밝게, 별도 패널로 분리되는 느낌) |
| `--muted` | `#171B25` | 인풋 배경 등 저강조 표면 |
| `--muted-foreground` | `#8B90A3` | 보조 텍스트 (타임스탬프, 설명) |
| `--border` | `rgba(255,255,255,.06)` | 얇은 구분선 (필요한 곳에만 최소로) |
| `--input` | `rgba(255,255,255,.12)` | 폼 필드 테두리 |
| `--primary` | `#D9A441` (웜 앰버) | 버튼·강조·포커스 링·사이드바 활성 상태 |
| `--primary-foreground` | `#0B0E14` | 앰버 배경 위 텍스트 |
| `--secondary` / `--accent` | `#1B202C` | 보조 버튼, 호버 배경 |
| `--destructive` | `#E5484D` | 위험 액션(계정 삭제 등) |
| `--destructive-foreground` | `#F2F3F7` | 위 위에 올라가는 텍스트 |
| `--ring` | `#D9A441` | 포커스 링 |

위험도 배지 (`risk-badge.tsx`, `--risk-*` 토큰) — high/medium/low 값만 새 톤으로 재조정, 개념(신호등 성격)은 유지:

| 레벨 | 텍스트 색 | 배경(투명도) |
|---|---|---|
| high | `#FF8A8A` | `rgba(255,138,138,.14)` |
| medium | `#E8BE73` | `rgba(232,190,115,.16)` |
| low | `#9DA2B5` | `rgba(139,144,163,.14)` |

## 타이포그래피

- 헤딩용 세리프 이탤릭(Newsreader)을 제거하고 본문과 동일한 산세리프(Geist Sans)로 통일
- 위계는 폰트 굳기(semibold/bold)와 자간(`tracking-tight`)으로 표현, 별도 `--font-heading` 토큰 삭제
- `layout.tsx`의 `Newsreader` import와 `--font-newsreader` variable 제거

## 컴포넌트 형태

- **카드**: 테두리 없음, `rounded-2xl`(16px), 배경색 차이로만 구획 — 대시보드/검토 큐의 댓글 카드, 요약 통계 타일 등에 적용
- **배지**: 알약형(`rounded-full`) 유지, 색만 위 표로 교체
- **버튼**: 기존 radius 유지 수준(`rounded-lg` 정도), primary는 앰버 채움 버튼
- **사이드바**: 배경 `--sidebar`, 활성 메뉴 항목에 앰버 포인트(텍스트 또는 좌측 인디케이터)
- **`comments-table.tsx`**: 현재 `<table>` 구조를 카드 리스트로 구조 변경 — 각 행(댓글 내용, 카테고리, confidence, 위험도 배지, 오탐 신고/검토 확정 액션)을 위 카드 스타일의 한 아이템으로 재구성

## 대시보드 레이아웃

- 상단에 요약 통계 스트립(`summary-tiles.tsx`) 유지: 전체 / 위험 높음 / 검토 필요 건수를 작은 라운드 타일로
- 그 아래 카드 리스트(위 컴포넌트 형태 참조)
- 필터(`comment-filters.tsx`)는 리스트 위, 통계 스트립 아래에 배치

## 라이트모드 제거

- `next-themes`의 `ThemeProvider`(`layout.tsx`) 제거, `attribute="class"`/`defaultTheme` 분기 자체를 없앰
- `theme-toggle.tsx` 삭제, `app-sidebar.tsx`에서의 렌더 지점 제거
- `package.json`의 `next-themes` 의존성 제거 (구현 단계에서 다른 사용처 없는지 재확인 후 정리)

## 로그인 화면

- 현재 좌(강제 다크 브랜드 패널)/우(라이트 로그인 폼) 분할 구조에서, 라이트모드가 사라지므로 양쪽 다 다크 톤이 됨 — 좌/우는 배경 레이어 차이(`--background` vs `--card` 또는 `--sidebar`)로만 구분
- 기존 스캔라인 모션(`animate-scan-sweep`)은 유지하되 그라디언트 색을 스틸블루(`#547792`)에서 앰버 계열의 은은한 톤으로 교체 (너무 튀지 않게, 로그인 카피 "조용히 지켜보고"와 톤 일치)

## 적용 범위 (파일)

- `src/app/globals.css` — 토큰 전면 교체, `.dark` 분기 삭제
- `src/app/layout.tsx` — ThemeProvider 제거, Newsreader 폰트 제거
- `src/app/page.tsx` (로그인), `src/app/onboarding/page.tsx`, `src/app/(app)/layout.tsx`, `dashboard/page.tsx`, `review/page.tsx`, `settings/page.tsx`
- `src/components/layout/app-sidebar.tsx`, `sidebar-nav.tsx`, `theme-toggle.tsx`(삭제)
- `src/components/dashboard/*` (`comments-table.tsx` 구조 변경 포함), `src/components/comments/status-action-button.tsx`, `src/components/settings/danger-zone-button.tsx`, `src/components/auth/*`

## 검증 방법

- `npx tsc --noEmit && npm run lint` 통과
- 로그인/온보딩/대시보드/검토/설정 5개 화면을 브라우저에서 직접 확인 (다크 톤 일관성, 배지 대비, 앰버 포인트 과하지 않은지)
- 자동화된 시각 테스트는 없으므로 최종 확인은 사용자 육안 검수로 완료
