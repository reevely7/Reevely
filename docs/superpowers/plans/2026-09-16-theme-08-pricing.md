# 8단계: 요금제 화면 리디자인 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 랜딩페이지 요금제 섹션의 카드 4개(무료/베이직/플러스/프로) 액센트 색을 동일한
그린 톤으로 통일하고, 헤더/서브 카피와 결제 안내 문구를 스펙 문구로 교체한다.

**Architecture:** 변경은 `src/components/landing/pricing-table.tsx`(공유 `PLANS`
배열 + `PricingTable`/`PlanComparisonTable` 두 컴포넌트)와 `src/app/page.tsx`(랜딩
CTA 문구) 두 파일에 국한된 순수 카피/스타일 변경. 로직·인터페이스 변경 없음.

**Tech Stack:** Next.js App Router, React, Tailwind CSS(시맨틱 토큰 클래스).

**Spec:** `docs/superpowers/specs/2026-09-15-reevely-ui-redesign.md` §10 "요금제 (PPT p.11)"

## Global Constraints

- 색상은 반드시 `src/app/globals.css`에 정의된 시맨틱 토큰 클래스(`bg-primary`,
  `text-primary` 등)만 사용한다. 하드코딩 hex(`#7f97b8` 등) 금지.
- "추천" 배지/링(`ring-chart-5`, `text-chart-5`, `bg-chart-5/10`)은 `src/app/(app)/mypage/subscription/plans/page.tsx`에서
  이미 쓰이는 기존 관례이므로 건드리지 않는다 — 이번 통일 대상은 카드 상단 바·플랜명·불릿
  색(`accentClass`/`textAccentClass`)뿐이다.
- `/mypage/subscription/plans`(실제 토스페이먼츠 결제 화면)는 이미 토큰 기반 스타일이라
  이번 플랜에서 코드 변경 없음 — 확인만 하고 넘어간다.
- 문구는 스펙 표(§10)의 "변경 후" 컬럼을 그대로 적용한다(사용자 확정, 2026-09-16:
  "스펙 그대로 적용").
- 카드 액센트 색은 4개 전부 `bg-primary`/`text-primary`로 통일한다(사용자 확정,
  2026-09-16: "전부 동일한 그린 톤으로 통일").

---

### Task 1: 요금제 카드 색 통일 + 카피 교체

**Files:**
- Modify: `src/components/landing/pricing-table.tsx`
- Modify: `src/app/page.tsx:172-188`

**Interfaces:**
- 없음 — `PricingTable`/`PlanComparisonTable`의 export 시그니처는 변경하지 않는다.
  내부 `Plan` 타입에서 `accentClass`/`textAccentClass` 필드를 제거하고 JSX에 직접
  `bg-primary`/`text-primary`를 쓴다.

- [ ] **Step 1: `pricing-table.tsx`의 `Plan` 타입과 `PLANS` 배열에서 색 필드 제거**

`src/components/landing/pricing-table.tsx` 1-51행을 아래로 교체:

```tsx
import { Check, X } from "lucide-react";

import { FREE_PLAN_HIGHLIGHTS, PLAN_HIGHLIGHTS } from "@/lib/billing/plan-copy";

type PlanFeatureValue = string | boolean;

type Plan = {
  name: string;
  tagline: string;
  price: string;
  highlights: string[];
  recommended?: boolean;
};

const PLANS: Plan[] = [
  {
    name: "무료",
    tagline: "일단 지켜보고 있다는 확신이 필요할 때",
    price: "0원",
    highlights: FREE_PLAN_HIGHLIGHTS,
  },
  {
    name: "베이직",
    tagline: "혼자 채널을 운영하는 크리에이터의 기본기",
    price: "19,900원",
    highlights: PLAN_HIGHLIGHTS.basic,
  },
  {
    name: "플러스",
    tagline: "채널이 여러 개로 늘어날 때",
    price: "39,900원",
    highlights: PLAN_HIGHLIGHTS.plus,
    recommended: true,
  },
  {
    name: "프로",
    tagline: "댓글 대응까지 자동으로 맡기고 싶을 때",
    price: "69,900원",
    highlights: PLAN_HIGHLIGHTS.pro,
  },
];
```

(그 아래 `PLAN_FEATURES` 배열은 그대로 둔다.)

- [ ] **Step 2: `PricingTable()` 헤더 카피 교체**

기존:

```tsx
        <h2 className="mb-2 text-xl font-semibold tracking-tight text-foreground">
          채널 규모에 맞게 골라 쓰세요
        </h2>
        <p className="text-sm text-muted-foreground">
          어떤 등급이든 AI 판정 정확도는 똑같습니다. 등급별로 갈라지는 건
          모니터링 범위와 기능 깊이뿐이에요.
        </p>
```

교체:

```tsx
        <h2 className="mb-2 text-xl font-semibold tracking-tight text-foreground">
          채널 규모에 맞는 댓글 보호 플랜을 선택하세요
        </h2>
        <p className="text-sm text-muted-foreground">
          어떤 등급이든 AI 판정 정확도는 동일합니다. 플랜별 차이는 분석량,
          모니터링 주기, 보관/대응 기능입니다.
        </p>
```

- [ ] **Step 3: 카드 상단 바 색 통일**

기존:

```tsx
            <div className={`h-1.5 w-full ${plan.accentClass}`} />
```

교체:

```tsx
            <div className="h-1.5 w-full bg-primary" />
```

- [ ] **Step 4: 플랜명 텍스트 색 통일**

기존:

```tsx
              <p
                className={`text-base font-semibold tracking-wide uppercase ${plan.textAccentClass}`}
              >
                {plan.name}
              </p>
```

교체:

```tsx
              <p className="text-base font-semibold tracking-wide uppercase text-primary">
                {plan.name}
              </p>
```

- [ ] **Step 5: 하이라이트 불릿 점 색 통일**

기존:

```tsx
                {plan.highlights.map((highlight) => (
                  <li key={highlight} className="flex items-start gap-2.5">
                    <span
                      className={`mt-1.5 size-1.5 shrink-0 rounded-full ${plan.accentClass}`}
                      aria-hidden
                    />
                    {highlight}
                  </li>
                ))}
```

교체:

```tsx
                {plan.highlights.map((highlight) => (
                  <li key={highlight} className="flex items-start gap-2.5">
                    <span
                      className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary"
                      aria-hidden
                    />
                    {highlight}
                  </li>
                ))}
```

- [ ] **Step 6: `PlanComparisonTable()` 헤더 셀 색 통일**

기존:

```tsx
              {PLANS.map((plan) => (
                <th key={plan.name} scope="col" className="px-5 py-4 align-bottom">
                  <span
                    className={`text-xs font-semibold tracking-wide uppercase ${plan.textAccentClass}`}
                  >
                    {plan.name}
                  </span>
                </th>
              ))}
```

교체:

```tsx
              {PLANS.map((plan) => (
                <th key={plan.name} scope="col" className="px-5 py-4 align-bottom">
                  <span className="text-xs font-semibold tracking-wide uppercase text-primary">
                    {plan.name}
                  </span>
                </th>
              ))}
```

- [ ] **Step 7: 랜딩페이지 결제 안내 문구 교체**

`src/app/page.tsx`에서 기존:

```tsx
            <p className="text-xs text-muted-foreground">
              결제 기능은 아직 준비 중입니다. 지금 가입하면 정식 출시 때
              가장 먼저 안내드릴게요.
            </p>
```

교체:

```tsx
            <p className="text-xs text-muted-foreground">
              지금 가입하면 정식 출시 시 가장 먼저 안내드립니다.
            </p>
```

- [ ] **Step 8: 빌드 검증**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음

- [ ] **Step 9: 커밋**

```bash
git add src/components/landing/pricing-table.tsx src/app/page.tsx
git commit -m "feat: 요금제 카드 색상 통일 및 결제 안내 문구 갱신"
```

---

## 참고: 코드 검토만 하고 변경하지 않는 범위

- `src/app/(app)/mypage/subscription/plans/page.tsx` — 실제 토스페이먼츠 체크아웃이
  붙은 화면. 이미 `bg-card`/`ring-primary`/`ring-chart-5`/`bg-primary` 등 시맨틱
  토큰만 쓰고 있어 별도 수정 불필요 (2026-09-16 확인).
- `src/app/billing/fail/page.tsx` — 이미 시맨틱 토큰만 사용, 수정 불필요.
