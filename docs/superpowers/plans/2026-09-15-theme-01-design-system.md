# Reevely 화이트+딥그린 공통 디자인 시스템 전환 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 전 화면이 공유하는 컬러 토큰(`globals.css`)과 버튼 컴포넌트를 다크+골드 팔레트에서 화이트+딥그린 팔레트로 전환한다. 이후 진행할 화면별 작업(대시보드, 댓글 목록 등)이 이 토큰 위에서 자동으로 재색상되도록 하는 기반 작업.

**Architecture:** 모든 색은 `globals.css`의 CSS 커스텀 프로퍼티(디자인 토큰) 한 곳에서만 정의하고, 컴포넌트는 토큰에 대응하는 Tailwind 유틸리티 클래스(`bg-background`, `text-risk-high` 등)만 사용한다 — 2026-08-19 다크 리디자인 때 이미 이 구조로 통일해 둔 덕분에, 이번 작업도 대부분 `globals.css` 값 교체만으로 전체 화면에 반영된다. `.dark` 분기나 next-themes는 없다 (`:root` 단일 팔레트 유지).

**Tech Stack:** Next.js App Router, Tailwind CSS v4 (`@theme inline` 토큰), shadcn/ui(Base UI 기반 `Button`), TypeScript.

**Spec:** `docs/superpowers/specs/2026-09-15-reevely-ui-redesign.md` (특히 "브랜드 팔레트", "02. 공통 디자인 시스템", "12. 액션 버튼·상태값 통일" 섹션)

## Global Constraints

- 브랜드 팔레트: `#1E2D26`(다크그린 텍스트), `#3E6856`(브랜드 그린 primary), `#DBE6D9`(연한 카드/배지), `#EDEDED`(보조선/배경), 배경 `#F8FAF7`/`#FFFFFF`, 버튼 테두리 `#CAD6C7`
- 컬러 토큰 변경은 **전역 적용** — `/admin` 스태프 패널도 함께 바뀐다 (사용자 확정)
- 버튼 높이 36~40px, 배지는 전부 pill(`rounded-full`) 형태 유지
- 작업 브랜치는 `theme` — **develop에는 push/merge 금지**
- 커밋 전 `npx tsc --noEmit && npm run lint` 통과 확인 (CLAUDE.md)
- 커밋 메시지: `refactor: 간결한 설명` (표현 계층 재구성이므로 refactor)
- `any` 타입 금지, 프로덕션 코드 `console.log` 금지 — 이번 작업 범위엔 해당 없음
- 이 저장소에는 자동화 테스트 프레임워크가 없다. 각 태스크의 "테스트"는 `npx tsc --noEmit && npm run lint` + 특정 hex 문자열이 더 이상 없음을 확인하는 `grep` 체크 + dev 서버 스크린샷 육안 대조로 대체한다.

---

## 파일 구조 개요

| 파일 | 변경 여부 | 비고 |
|---|---|---|
| `src/app/globals.css` | 전면 교체 | 컬러 토큰 값만 교체, 변수 이름/구조는 유지 |
| `src/components/ui/button.tsx` | 수정 | 버튼 높이 36~40px로 조정 |
| `src/components/dashboard/comments-table.tsx` | 주석만 수정 | "확정=블루/검토필요=퍼플" 주석이 이제 사실과 다름 (색은 토큰 교체로 자동 반영, 주석만 정정) |
| `src/components/dashboard/risk-badge.tsx` | **변경 없음** | 이미 토큰 기반, pill 형태 — 토큰 교체만으로 자동 재색상 |
| `src/components/layout/app-sidebar.tsx`, `sidebar-nav.tsx` | **변경 없음** | 이미 `bg-sidebar`, `text-muted-foreground`, `bg-sidebar-accent`, `text-primary` 등 토큰 클래스만 사용 |

---

### Task 1: 컬러 토큰 전면 교체

**Files:**
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: 없음 (최초 태스크)
- Produces: 아래 CSS 커스텀 프로퍼티. 이후 모든 컴포넌트가 그대로 소비 (변수 이름 변경 없음, 값만 교체).

- [ ] **Step 1: `:root` 블록 전체를 아래 값으로 교체**

`src/app/globals.css`의 `:root { ... }` 블록(현재 66~127행)을 다음으로 교체한다:

```css
:root {
  /* Reevely 화이트+딥그린 팔레트 (2026-09-15 리디자인).
     :root 하나가 유일한 팔레트 — 다크모드 없음. */
  --background: #f8faf7;
  --foreground: #1e2d26;
  --card: #ffffff;
  --card-foreground: #1e2d26;
  --popover: #ffffff;
  --popover-foreground: #1e2d26;
  --primary: #3e6856;
  --primary-foreground: #ffffff;
  --secondary: #dbe6d9;
  --secondary-foreground: #1e2d26;
  --muted: #ededed;
  --muted-foreground: #6b7a72;
  --accent: #dbe6d9;
  --accent-foreground: #1e2d26;
  --destructive: #dc2626;
  --destructive-foreground: #ffffff;
  --border: #ededed;
  --input: #cad6c7;
  --ring: #3e6856;
  --chart-1: #3e6856;
  --chart-2: #6b9080;
  --chart-3: #cad6c7;
  --chart-4: #d97706;
  --chart-5: #4a7c82;
  --radius: 0.625rem;
  --sidebar: #ffffff;
  --sidebar-foreground: #1e2d26;
  --sidebar-primary: #3e6856;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: #dbe6d9;
  --sidebar-accent-foreground: #1e2d26;
  --sidebar-border: #ededed;
  --sidebar-ring: #3e6856;

  /* 선택/확장된 행 배경 워시 전용 (comments-table.tsx의 bg-highlight/10) */
  --highlight: #6b9080;

  /* 위험도 배지 — 연한 배경(-bg)에 진한 텍스트(base) 쌍으로 쓰는 소프트 배지와,
     notification-bell.tsx처럼 배경을 꽉 채우는 solid 배지(-foreground) 둘 다 지원 */
  --risk-high: #dc2626;
  --risk-high-foreground: #ffffff;
  --risk-high-bg: rgba(220, 38, 38, 0.12);
  --risk-medium: #d97706;
  --risk-medium-foreground: #ffffff;
  --risk-medium-bg: rgba(217, 119, 6, 0.14);
  --risk-low: #3e8562;
  --risk-low-foreground: #ffffff;
  --risk-low-bg: rgba(62, 133, 98, 0.12);

  /* "확정/정상" 상태 배지 — 초록 계열 (risk-low와 계열은 같지만 별도 변수라
     이후 톤을 따로 미세조정할 수 있음) */
  --status-confirmed: #2f855a;
  --status-confirmed-bg: rgba(47, 133, 90, 0.12);

  /* "검토 필요" 상태 배지 — 노랑/amber 계열 */
  --status-needs-review: #b7791f;
  --status-needs-review-bg: rgba(183, 121, 31, 0.14);
}
```

- [ ] **Step 2: `@theme inline` 블록 상단 주석 정정**

41행 `/* 위험도 배지 전용 색 — 브랜드 팔레트와 분리된 "인장(印章)" 톤 */` 과 52행
`/* 상태 배지 전용 색 — primary(골드)·risk-medium(주황골드)과 헷갈리지 않도록 분리 */`
두 주석에서 "골드" 언급이 더 이상 사실이 아니므로 아래로 교체한다 (변수 목록 자체는 그대로 둠):

```css
  /* 위험도 배지 전용 색 — 브랜드 그린(primary)과 분리된 시맨틱 톤 */
  --color-risk-high: var(--risk-high);
  ...
  /* 상태 배지 전용 색 — primary(그린)·risk-low(연녹)와 헷갈리지 않도록 분리 */
  --color-status-confirmed: var(--status-confirmed);
```

- [ ] **Step 3: 빌드 확인**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음 (CSS 값만 바꿨으므로 타입/린트에 영향 없어야 함)

- [ ] **Step 4: 옛 골드/다크 hex가 안 남았는지 확인**

Run: `grep -n "#ccae5f\|#191919\|#141414\|#18150f" src/app/globals.css`
Expected: 결과 없음 (모두 교체됨)

- [ ] **Step 5: 커밋**

```bash
git add src/app/globals.css
git commit -m "refactor: 컬러 토큰을 다크+골드에서 화이트+딥그린 팔레트로 교체"
```

---

### Task 2: 버튼 높이 36~40px로 조정

**Files:**
- Modify: `src/components/ui/button.tsx`

**Interfaces:**
- Consumes: Task 1의 `--primary`, `--secondary`, `--border`, `--background` 토큰 (색은 이미 반영됨, 이 태스크는 높이만 조정)
- Produces: `size="default"` → 36px(h-9), `size="lg"` → 40px(h-10). `xs`/`sm`/`icon*` 사이즈는 표/인라인 액션용이라 스펙 대상(36~40px, "버튼"이라 함은 페이지 상단 CTA·주요 액션 버튼 기준)이 아니므로 변경하지 않는다.

- [ ] **Step 1: `size` variants에서 `default`/`lg` 높이 변경**

`src/components/ui/button.tsx` 23~27행을 아래로 교체:

```ts
      size: {
        default:
          "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-10 gap-1.5 px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        icon: "size-9",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-10",
      },
```

(`icon`/`icon-lg`도 `default`/`lg`와 정사각형을 맞추기 위해 `size-8`→`size-9`, `size-9`→`size-10`로 함께 조정)

- [ ] **Step 2: 빌드 확인**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음

- [ ] **Step 3: 눈으로 확인**

Run: `npm run dev` 후 로그인 화면(`/`) 또는 `/mypage/account` 접속해 기본 버튼 높이가 이전보다 살짝 커졌는지, 레이아웃이 깨지지 않았는지 확인. (이 저장소는 자동 시각 회귀 테스트가 없으므로 육안 확인이 최종 검증)

- [ ] **Step 4: 커밋**

```bash
git add src/components/ui/button.tsx
git commit -m "refactor: 버튼 기본/large 높이를 36px/40px로 조정"
```

---

### Task 3: 상태 배지 주석 정정

**Files:**
- Modify: `src/components/dashboard/comments-table.tsx:57`

**Interfaces:**
- Consumes: Task 1의 `--status-confirmed`(초록), `--status-needs-review`(노랑) 토큰
- Produces: 없음 (주석만 정정, 동작 변경 없음)

- [ ] **Step 1: 색상 설명 주석 정정**

57행:
```ts
// "확정"은 블루(status-confirmed), "검토 필요"는 퍼플(status-needs-review)로 분리해
```
를 아래로 교체:
```ts
// "확정"은 초록(status-confirmed), "검토 필요"는 노랑(status-needs-review)으로 분리해
```

- [ ] **Step 2: 빌드 확인**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add src/components/dashboard/comments-table.tsx
git commit -m "docs: 상태 배지 색상 주석을 새 팔레트 기준으로 정정"
```

---

### Task 4: 전체 화면 육안 검증

**Files:** 없음 (검증 전용 태스크)

- [ ] **Step 1: dev 서버 실행**

Run: `npm run dev`

- [ ] **Step 2: 대표 화면 스크린샷 대조**

로그인 화면(`/`), 대시보드(`/c/[channelId]/dashboard`), `/admin` 최소 1페이지를 열어 다음을 확인:
- 배경이 흰색/연한 그린(`#F8FAF7`)으로 바뀌었는가
- 사이드바·주요 버튼이 골드가 아닌 그린(`#3E6856`)인가
- 위험도 배지(High/Medium/Low)가 pill 형태 유지한 채 빨강/주황/초록으로 보이는가
- 텍스트 대비(다크그린 `#1E2D26` on 흰 배경)가 읽기 편한가

- [ ] **Step 3: 문제 발견 시 Task 1로 돌아가 토큰 값만 조정 (컴포넌트 코드는 건드리지 않음)**

---

## 다음 단계

이 플랜 완료 후, 스펙(`docs/superpowers/specs/2026-09-15-reevely-ui-redesign.md`)에 정리된 순서대로 화면별 플랜을 하나씩 새로 작성한다: 대시보드 → 댓글 목록 → 알림 → 검토 필요 → 증거 보관함 → 주간 요약 → 요금제 → 채널·계정 영역 → 랜딩페이지 → 전체 재점검 → 반응형.
