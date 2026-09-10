# Reevely 구독 결제(토스페이먼츠) 설계

## 배경 및 목적

무료/베이직/플러스/프로 4단계 요금제와 각 플랜의 기능 한도는 이미 확정됨(`src/app/page.tsx`의
`PLANS`/`PLAN_FEATURES` 참조, 가격: 0원/19,900원/39,900원/69,900원). 이번 스펙은 이걸 실제로
결제받을 수 있게 만드는 결제/구독 코어를 다룬다.

결제대행사는 **토스페이먼츠**로 확정 (Stripe는 한국 미지원 국가라 제외). 연동 방식은 토스가
제공하는 **호스팅 카드 등록 인증창**으로 빌링키를 발급받고, 서버가 그 빌링키로 매달 자동
청구하는 방식이다 — 카드번호를 직접 수집하지 않으므로 API 개별연동키 중 클라이언트 키·시크릿
키만 쓰고 보안키는 불필요하다.

## 범위

### 이번 스펙에 포함

- 결제/구독 코어: 최초 가입(카드 등록 → 빌링키 발급 → 첫 결제), 플랜 변경, 해지, 매달 자동 청구,
  결제 실패 시 유예 후 재시도
- 이미 강제 지점이 존재하는 한도 2종 연동: **월 댓글 분석량**, **댓글 업데이트 주기**

### 이번 스펙에서 제외 (비목표)

- **유튜브 연동 개수 한도** — `channels` 테이블에 `(userId, platform)` unique 제약이 있어 유저당
  채널이 원천적으로 1개뿐이고, 온보딩·사이드바·대시보드 전부 "채널 1개"를 전제로 만들어져 있다.
  멀티 채널 지원 자체가 없는 상태라 결제 스펙에 끼워 넣을 수 없다. 별도의 멀티 채널 지원 기능이
  생길 때 같이 다룬다.
- 이메일 알림, 증거 보관함, 증거 PDF 저장, 대댓글 전체 수집(현재 스레드당 5개까지만 자동 수집),
  반복 위험 작성자 분석, 댓글 대응 관리 — 전부 기능 자체가 아직 없다. 각 기능을 만들 때 그 기능의
  플랜별 한도를 같이 설계한다.
- 환불, 정산/세금계산서, 팀 결제(사업자 대량 구독) 등은 다루지 않는다.

## 스키마

기존 `src/lib/db/schema.ts` 컨벤션(uuid pk, `withTimezone` timestamp, pgEnum)을 따른다.

```ts
export const subscriptionPlanEnum = pgEnum("subscription_plan", [
  "basic",
  "plus",
  "pro",
]);
// 무료는 별도 값이 없다 — subscriptions에 row가 없으면 무료로 취급한다.

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active", // 정상 구독 중, nextBillingDate에 정기 청구
  "canceled_pending", // 해지 신청함. 이미 낸 기간은 유지, nextBillingDate에 row 삭제(무료 전환)
  "payment_failed", // 정기 청구 실패, 유예기간 중. nextBillingDate는 재시도 예정일로 재사용됨
]);

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().unique(),
  plan: subscriptionPlanEnum("plan").notNull(),
  // 다음 결제일부터 적용될 플랜 변경 예약. 변경 없으면 null.
  pendingPlan: subscriptionPlanEnum("pending_plan"),
  status: subscriptionStatusEnum("status").notNull().default("active"),
  // 토스 빌링키 — refresh token과 동일하게 암호화 저장 (src/lib/crypto/token-cipher.ts 재사용)
  billingKey: text("billing_key").notNull(),
  // 토스 빌링 API가 요구하는 상점 측 고객 식별자. userId를 그대로 사용한다.
  tossCustomerKey: text("toss_customer_key").notNull(),
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true }).notNull(),
  // 정상 상태에선 "다음 정기결제일", payment_failed 상태에선 "재시도 예정일"로 재사용
  nextBillingDate: timestamp("next_billing_date", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const paymentStatusEnum = pgEnum("payment_status", ["succeeded", "failed"]);

// 결제 시도 감사 로그 — 결제 문의 대응, 영수증 표시용
export const paymentHistory = pgTable("payment_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  plan: subscriptionPlanEnum("plan").notNull(),
  amount: integer("amount").notNull(),
  status: paymentStatusEnum("status").notNull(),
  tossPaymentKey: text("toss_payment_key"),
  failReason: text("fail_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

## 결제 흐름

### 최초 가입 (무료 → 유료)

1. 유저가 플랜 선택 → 프론트에서 토스 SDK `requestBillingAuth()` 호출, 토스 호스팅 카드
   등록창으로 이동
2. 완료되면 `authKey`를 들고 우리 사이트의 `/billing/success`로 리다이렉트
3. 서버가 `authKey`로 토스의 빌링키 발급 API 호출 → 빌링키 획득
4. 카드 등록 자체는 결제가 아니므로, 곧바로 해당 플랜 금액으로 첫 결제 API를 호출한다. **이
   첫 결제가 성공해야만** 암호화한 빌링키로 `subscriptions`를 insert한다(`status="active"`,
   `currentPeriodStart=now`, `nextBillingDate=now+1개월`) — 실패하면 구독 row를 만들지 않고
   유저에게 결제 실패를 바로 보여준다. `payment_history`엔 성공/실패 모두 기록.

### 플랜 변경 (업/다운그레이드)

`pendingPlan`만 세팅. 즉시 반영되는 건 없고, 다음 결제일 cron에서 처리된다.

### 해지

`status="canceled_pending"`으로 변경. 이미 낸 기간은 그대로 쓰고, 다음 결제일에 cron이 row를
삭제해 무료로 전환한다.

### 자동 청구 cron (`/api/cron/process-billing`, 매일 1회, 기존 `process-comments` cron과 분리)

`nextBillingDate <= now`인 구독마다 `status`로 분기:

- **`canceled_pending`** → row 삭제 (무료 전환)
- **`active`** (정기 청구) →
  - 성공 → `plan = pendingPlan ?? plan`, `pendingPlan = null`, `nextBillingDate += 1개월`,
    `payment_history`에 성공 기록
  - 실패 → `status = "payment_failed"`, `nextBillingDate = now + 3일` (재시도 예정일로 재사용),
    `notifications`에 결제 실패 알림 추가(기존 테이블 재사용), `payment_history`에 실패 기록
- **`payment_failed`** (재시도, 유예기간 중엔 플랜 유지) →
  - 성공 → `status = "active"`, `plan = pendingPlan ?? plan`, `pendingPlan = null`,
    `nextBillingDate += 1개월`, `payment_history` 성공 기록
  - 실패 → row 삭제 (무료 전환), `notifications`에 "재시도 실패, 무료 전환" 알림 추가,
    `payment_history` 실패 기록

총 유예기간은 최초 실패일로부터 3일. `nextBillingDate` 필드를 "다음 정기결제일"과 "재시도
예정일" 양쪽에 재사용해 필드 추가 없이 처리한다.

토스의 정기 청구 API는 동기 응답이라(요청하면 즉시 성공/실패를 받음) 별도 웹훅 인프라 없이
cron 안에서 바로 처리 가능하다.

## 한도 강제

### 월 댓글 분석량

`src/lib/ai/analyze-pending-comments.ts`의 `MAX_BATCH=20`은 배치당 고정값이고 월별 카운터가
없다(CLAUDE.md: "별도 유저별 일일 카운터는 안 둠"). 이번에 "이번 달 분석된 댓글 수"를 세는
쿼리를 추가하고, 플랜별 월 한도(무료 1,000 / 베이직 10,000 / 플러스 30,000 / 프로 50,000)와
비교해 배치 크기를 동적으로 줄인다(한도 초과분은 `needs_review`도 아닌 미분석 상태로 대기).

### 댓글 업데이트 주기

`src/lib/db/queries/channels.ts`의 `isSyncDue()`가 쓰는 `FRESH_INTERVAL_MS`(1시간)/
`STALE_INTERVAL_MS`(6시간) 전역 상수를 플랜별 매핑(무료 24h / 베이직 6h / 플러스 1h / 프로
30min)으로 바꾸고, 채널 소유자의 구독 플랜을 조회해서 `isSyncDue()`에 넘긴다.

## 환경 변수

이미 `.env.local`에 등록됨:
- `NEXT_PUBLIC_TOSS_CLIENT_KEY`
- `TOSS_SECRET_KEY`
