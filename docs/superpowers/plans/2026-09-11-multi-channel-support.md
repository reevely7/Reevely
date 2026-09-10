# 멀티 채널 지원 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 유저 한 명이 유튜브 채널을 플랜 한도(무료/베이직 1개, 플러스 2개, 프로 3개)까지 여러 개
연동하고, 사이드바에서 채널을 전환하며 각 채널의 대시보드·댓글·알림을 독립적으로 볼 수 있게
한다.

**Architecture:** `channels` 테이블의 "유저당 1개" 제약을 풀고, `comments`/`notifications`/
`author_subscriptions`에 `channelId`를 추가해 모든 채널 종속 데이터를 채널 단위로 스코핑한다.
채널 종속 페이지(대시보드·댓글목록·검토·증거보관함·알림·주간요약·작성자상세)를
`/c/[channelId]/...`로 이동하고, 사이드바에 채널 전환 드롭다운 + "채널 추가"(기존
`/channel-connect/start` 재사용)를 붙인다. 로그인 체계(카카오)와 채널 연동(순수 구글 OAuth)은
이미 분리돼 있으므로 이번 작업은 그 위에 "여러 개 허용"만 얹는다.

**Tech Stack:** Next.js App Router, Drizzle ORM, Supabase Auth

**Spec:** `docs/superpowers/specs/2026-09-11-multi-channel-design.md`의 "스키마"·"라우트
재구성" 섹션 (로그인 체계·채널 연동 흐름은 이미 별도 계획으로 완료됨). 다운그레이드 시 초과
채널 자동 잠금 로직은 이번 계획에 **포함하지 않는다** — `channels.status` 컬럼만 추가해두고,
실제 잠금 자동화는 별도 후속 작업으로 미룬다(아래 "범위 밖" 참고).

## Global Constraints

- App Router만 사용, `pages/` 디렉터리 생성 금지
- DB 접근은 전부 `src/lib/db/queries/*`를 거친다
- `any` 타입 금지 (불가피하면 `unknown` + 타입가드)
- 프로덕션 코드(`src/`)에 `console.log` 금지, 에러 로깅은 `console.error`만 (`scripts/*.ts`는
  기존 컨벤션대로 `console.log` 허용)
- 커밋 전 `npx tsc --noEmit && npm run lint` 통과 확인
- 커밋 메시지: `feat|fix|docs|refactor: 간결한 설명`
- 이 저장소엔 테스트 프레임워크가 없음 — 검증은 tsc/lint + 수동 스크립트(`scripts/*.ts`, 실제
  DB 왕복) + 가능한 경우 curl/dev 서버로 한다

## 범위 밖 (이번 계획에서 안 하는 것)

- 다운그레이드 시 초과 채널을 `createdAt` 오름차순으로 자동 잠그는 cron 로직 (스펙엔 있지만
  아직 실제 유저가 2개 이상 채널을 가질 일이 없어 우선순위가 낮음 — `channels.status` 컬럼만
  미리 준비해두고 수동으로 `locked` 전환하는 것까지만 가능하게 한다)
- 증거 보관함(`evidence-archive`) 페이지의 실제 기능 구현 (지금도 플레이스홀더 — 이번엔 라우트
  위치만 옮긴다)

---

## Task 1: 스키마 1단계 — 채널 제약 변경 + channelId 컬럼 추가(nullable)

**Files:**
- Modify: `src/lib/db/schema.ts`

**Interfaces:**
- Produces: `channelStatusEnum`, `channels.status` 컬럼, `channels_user_youtube_unique` 제약,
  `comments.channelId`/`authorSubscriptions.channelId`/`notifications.channelId` (전부
  nullable) — Task 2가 백필 후 NOT NULL로 바꾼다.

- [ ] **Step 1: channelStatusEnum 추가 (platformEnum 바로 아래)**

```ts
export const channelStatusEnum = pgEnum("channel_status", ["active", "locked"]);
```

- [ ] **Step 2: channels 테이블 수정**

`channels` 테이블 정의에서:

```ts
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [unique("channels_user_platform_unique").on(table.userId, table.platform)],
);
```

를

```ts
    // 잠긴 채널은 cron sync 대상에서 제외됨(다운그레이드로 플랜 한도 초과 시)
    status: channelStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  // 같은 유튜브 채널 중복 연동만 막는다 — 유저당 개수 제한은 플랜 로직이 담당
  (table) => [unique("channels_user_youtube_unique").on(table.userId, table.youtubeChannelId)],
);
```

- [ ] **Step 3: comments 테이블에 channelId 추가 (nullable)**

`comments` 테이블의 `userId: uuid("user_id").notNull(),` 바로 다음 줄에 추가:

```ts
    // 백필 후 Task 2에서 notNull로 전환한다
    channelId: uuid("channel_id"),
```

- [ ] **Step 4: authorSubscriptions 테이블에 channelId 추가 (nullable)**

`authorSubscriptions` 테이블의 `userId: uuid("user_id").notNull(),` 바로 다음 줄에 추가:

```ts
    channelId: uuid("channel_id"),
```

- [ ] **Step 5: notifications 테이블에 channelId 추가 (nullable)**

`notifications` 테이블의 `userId: uuid("user_id").notNull(),` 바로 다음 줄에 추가:

```ts
  channelId: uuid("channel_id"),
```

- [ ] **Step 6: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 7: 마이그레이션 생성 및 적용**

Run: `npm run db:generate && npm run db:migrate`
Expected: enum 추가, `channels` 제약 변경, 3개 테이블에 nullable `channel_id` 컬럼 추가하는
마이그레이션이 생성되고 에러 없이 적용됨

- [ ] **Step 8: 커밋**

```bash
git add src/lib/db/schema.ts drizzle/
git commit -m "feat: 멀티채널 스키마 1단계 — 채널 제약 변경, channelId 컬럼 추가(nullable)"
```

---

## Task 2: 데이터 백필 + 스키마 2단계 — channelId NOT NULL 전환

**Files:**
- Create: `scripts/backfill-channel-ids.ts`
- Modify: `package.json` (스크립트 추가)
- Modify: `src/lib/db/schema.ts`

**Interfaces:**
- Consumes: Task 1의 nullable `channelId` 컬럼들
- Produces: `comments.channelId`/`authorSubscriptions.channelId`/`notifications.channelId`가
  전부 NOT NULL로 전환됨, `author_subscriptions`의 unique 제약이 `(channelId, authorChannelId)`로
  바뀜 — 이후 모든 태스크가 이 전제로 쿼리를 짠다.

- [ ] **Step 1: 백필 스크립트 작성**

```ts
// scripts/backfill-channel-ids.ts
// channels/comments/notifications/author_subscriptions에 channelId를 백필한다.
// 지금까지는 유저당 채널이 정확히 1개였으므로, 각 테이블의 userId로 해당 유저의
// 유일한 채널 id를 찾아 채워 넣으면 안전하다. 멀티채널 마이그레이션 1회성 스크립트
// (재실행해도 안전 — isNull 조건이라 이미 채워진 row는 건드리지 않음).
// 실행: npm run db:backfill-channel-ids
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import { and, eq, isNull } from "drizzle-orm";

import { db } from "../src/lib/db";
import { authorSubscriptions, channels, comments, notifications } from "../src/lib/db/schema";

async function main() {
  const allChannels = await db.select().from(channels);
  console.log(`채널 ${allChannels.length}개 발견`);

  for (const channel of allChannels) {
    const commentsUpdated = await db
      .update(comments)
      .set({ channelId: channel.id })
      .where(and(eq(comments.userId, channel.userId), isNull(comments.channelId)))
      .returning({ id: comments.id });

    const notificationsUpdated = await db
      .update(notifications)
      .set({ channelId: channel.id })
      .where(and(eq(notifications.userId, channel.userId), isNull(notifications.channelId)))
      .returning({ id: notifications.id });

    const authorSubsUpdated = await db
      .update(authorSubscriptions)
      .set({ channelId: channel.id })
      .where(
        and(
          eq(authorSubscriptions.userId, channel.userId),
          isNull(authorSubscriptions.channelId),
        ),
      )
      .returning({ id: authorSubscriptions.id });

    console.log(
      `${channel.channelTitle} (${channel.userId}): comments ${commentsUpdated.length}건, ` +
        `notifications ${notificationsUpdated.length}건, ` +
        `author_subscriptions ${authorSubsUpdated.length}건 백필`,
    );
  }

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

`package.json`의 `scripts`에 추가:
```json
"db:backfill-channel-ids": "tsx --conditions=react-server --env-file=.env.local scripts/backfill-channel-ids.ts"
```

- [ ] **Step 2: 백필 실행**

Run: `npm run db:backfill-channel-ids`
Expected: 채널 개수만큼 로그가 찍히고, 각 채널별로 백필된 건수가 나옴 (0건이어도 정상 — 그
채널에 아직 댓글/알림/구독이 없을 수 있음)

- [ ] **Step 3: schema.ts에서 3개 컬럼 NOT NULL로 전환 + author_subscriptions 제약 변경**

`comments` 테이블에서:
```ts
    channelId: uuid("channel_id"),
```
를
```ts
    channelId: uuid("channel_id").notNull(),
```
로.

`notifications` 테이블에서:
```ts
  channelId: uuid("channel_id"),
```
를
```ts
  channelId: uuid("channel_id").notNull(),
```
로.

`authorSubscriptions` 테이블에서:
```ts
    channelId: uuid("channel_id"),
```
를
```ts
    channelId: uuid("channel_id").notNull(),
```
로, 그리고 같은 테이블의 unique 제약을:
```ts
  (table) => [
    unique("author_subscriptions_user_author_unique").on(
      table.userId,
      table.authorChannelId,
    ),
  ],
```
를
```ts
  (table) => [
    unique("author_subscriptions_channel_author_unique").on(
      table.channelId,
      table.authorChannelId,
    ),
  ],
```
로 바꾼다.

- [ ] **Step 4: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음 (아직 쿼리 함수들은 안 고쳤으니 `src/lib/db/queries/*.ts`에서 타입 에러가
날 수 있음 — Task 3~6에서 고친다. 이 타입 에러들은 지금 무시하고 스키마/마이그레이션만
검증한다)

- [ ] **Step 5: 마이그레이션 생성 및 적용**

Run: `npm run db:generate && npm run db:migrate`
Expected: 3개 컬럼을 NOT NULL로 바꾸고 `author_subscriptions`의 unique 제약을 교체하는
마이그레이션이 생성되고 에러 없이 적용됨 (Step 2에서 이미 전부 백필했으므로 NOT NULL 전환이
실패하지 않아야 함)

- [ ] **Step 6: 커밋**

```bash
git add scripts/backfill-channel-ids.ts package.json src/lib/db/schema.ts drizzle/
git commit -m "feat: channelId 백필 및 NOT NULL 전환 (멀티채널 스키마 2단계)"
```

---

## Task 3: channels.ts 쿼리 재작성

**Files:**
- Modify: `src/lib/db/queries/channels.ts`

**Interfaces:**
- Consumes: Task 1-2의 스키마 (`channels.status`, `channels_user_youtube_unique`)
- Produces:
  - `getChannelsByUserId(userId: string): Promise<Channel[]>` (생성일 오름차순)
  - `getChannelById(channelId: string): Promise<Channel | null>`
  - `countActiveChannelsByUserId(userId: string): Promise<number>`
  - `deleteChannelById(channelId: string): Promise<void>`
  - `upsertChannel(input: UpsertChannelInput): Promise<string>` (채널 id 리턴하도록 변경 —
    기존엔 void)
  - `getChannelByUserId` **삭제** (아래에서 전부 대체되므로 죽은 코드)
  - `getAllChannels`, `isSyncDue`, `getNextSyncAt`, `markSynced`, `deleteChannelByUserId`는
    변경 없음
  - Task 4(connect-channel.ts), Task 7-9(레이아웃/페이지)가 이 함수들을 가져다 쓴다

- [ ] **Step 1: 파일 전체를 아래 내용으로 교체**

```ts
import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { channels } from "@/lib/db/schema";

export async function getChannelsByUserId(userId: string) {
  return db
    .select()
    .from(channels)
    .where(eq(channels.userId, userId))
    .orderBy(asc(channels.createdAt));
}

export async function getChannelById(channelId: string) {
  const [channel] = await db
    .select()
    .from(channels)
    .where(eq(channels.id, channelId))
    .limit(1);

  return channel ?? null;
}

export async function countActiveChannelsByUserId(userId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(channels)
    .where(and(eq(channels.userId, userId), eq(channels.status, "active")));

  return row?.count ?? 0;
}

// cron이 전체 연동 채널을 순회하며 자동 sync+분석을 돌릴 때 사용
export async function getAllChannels() {
  return db.select().from(channels);
}

export async function deleteChannelById(channelId: string) {
  await db.delete(channels).where(eq(channels.id, channelId));
}

// 계정 삭제 시 그 유저의 채널을 전부 지운다 (몇 개든 상관없음)
export async function deleteChannelByUserId(userId: string) {
  await db.delete(channels).where(eq(channels.userId, userId));
}

type Channel = {
  lastSyncedAt: Date | null;
  latestVideoPublishedAt: Date | null;
};

const FRESH_WINDOW_MS = 48 * 60 * 60 * 1000;
const FRESH_INTERVAL_MS = 60 * 60 * 1000;
const STALE_INTERVAL_MS = 6 * 60 * 60 * 1000;

export function isSyncDue(channel: Channel, now: Date = new Date()) {
  const isFresh =
    channel.latestVideoPublishedAt != null &&
    now.getTime() - channel.latestVideoPublishedAt.getTime() <
      FRESH_WINDOW_MS;

  const interval = isFresh ? FRESH_INTERVAL_MS : STALE_INTERVAL_MS;

  return (
    !channel.lastSyncedAt ||
    now.getTime() - channel.lastSyncedAt.getTime() >= interval
  );
}

// 사이드바 상태 표시용 — 다음 자동 확인이 대략 언제일지 계산
export function getNextSyncAt(channel: Channel, now: Date = new Date()): Date {
  if (!channel.lastSyncedAt) return now;

  const isFresh =
    channel.latestVideoPublishedAt != null &&
    now.getTime() - channel.latestVideoPublishedAt.getTime() <
      FRESH_WINDOW_MS;

  const interval = isFresh ? FRESH_INTERVAL_MS : STALE_INTERVAL_MS;
  return new Date(channel.lastSyncedAt.getTime() + interval);
}

export async function markSynced(
  channelId: string,
  latestVideoPublishedAt: Date | null,
) {
  await db
    .update(channels)
    .set({
      lastSyncedAt: new Date(),
      ...(latestVideoPublishedAt ? { latestVideoPublishedAt } : {}),
    })
    .where(eq(channels.id, channelId));
}

type UpsertChannelInput = {
  userId: string;
  youtubeChannelId: string;
  channelTitle: string;
  thumbnailUrl: string | null;
  subscriberCount: number | null;
  uploadsPlaylistId: string | null;
  encryptedRefreshToken?: string;
};

// (userId, youtubeChannelId) 조합으로 기존 채널인지 판단한다 — 같은 채널을 다시
// 연동(토큰 갱신)하면 update, 새 채널이면 insert. 채널 id를 리턴해서 호출부가
// 방금 연동/갱신된 채널로 바로 이동할 수 있게 한다.
export async function upsertChannel(input: UpsertChannelInput): Promise<string> {
  const [existing] = await db
    .select()
    .from(channels)
    .where(
      and(
        eq(channels.userId, input.userId),
        eq(channels.youtubeChannelId, input.youtubeChannelId),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .update(channels)
      .set({
        channelTitle: input.channelTitle,
        thumbnailUrl: input.thumbnailUrl,
        subscriberCount: input.subscriberCount,
        uploadsPlaylistId: input.uploadsPlaylistId,
        updatedAt: new Date(),
        ...(input.encryptedRefreshToken
          ? { refreshToken: input.encryptedRefreshToken }
          : {}),
      })
      .where(eq(channels.id, existing.id));
    return existing.id;
  }

  if (!input.encryptedRefreshToken) {
    throw new Error("최초 채널 연동 시 refresh token이 반드시 필요합니다.");
  }

  const [inserted] = await db
    .insert(channels)
    .values({
      userId: input.userId,
      youtubeChannelId: input.youtubeChannelId,
      channelTitle: input.channelTitle,
      thumbnailUrl: input.thumbnailUrl,
      subscriberCount: input.subscriberCount,
      uploadsPlaylistId: input.uploadsPlaylistId,
      refreshToken: input.encryptedRefreshToken,
    })
    .returning({ id: channels.id });

  return inserted.id;
}
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 이 파일 자체는 에러 없음. 이 파일을 가져다 쓰는 다른 파일들(connect-channel.ts,
페이지들)은 아직 옛 API(`getChannelByUserId` 등)를 참조하고 있어 에러가 날 수 있음 — Task
4~9에서 전부 고친다. 지금은 `channels.ts` 자체 컴파일만 확인.

- [ ] **Step 3: 커밋**

```bash
git add src/lib/db/queries/channels.ts
git commit -m "feat: 채널 쿼리 함수를 멀티채널 대응으로 재작성"
```

---

## Task 4: connect-channel.ts + channel-connect 라우트 — 플랜 한도 체크, channelId 리턴

**Files:**
- Modify: `src/lib/db/queries/subscriptions.ts`
- Modify: `src/lib/youtube/connect-channel.ts`
- Modify: `src/app/channel-connect/start/route.ts`
- Modify: `src/app/channel-connect/callback/route.ts`

**Interfaces:**
- Consumes: `getChannelsByUserId`, `countActiveChannelsByUserId`, `upsertChannel` (Task 3),
  `getSubscriptionByUserId` (기존)
- Produces: `PLAN_CHANNEL_LIMITS`, `FREE_CHANNEL_LIMIT` (subscriptions.ts),
  `connectChannel(): Promise<string>` (channelId 리턴하도록 변경), `ChannelLimitError` —
  channel-connect/callback이 이 에러를 구분해서 처리

- [ ] **Step 1: subscriptions.ts에 플랜별 채널 한도 상수 추가**

`src/lib/db/queries/subscriptions.ts`의 `PLAN_LABELS` 정의 바로 다음에 추가:

```ts
export const PLAN_CHANNEL_LIMITS: Record<SubscriptionPlan, number> = {
  basic: 1,
  plus: 2,
  pro: 3,
};

export const FREE_CHANNEL_LIMIT = 1;
```

- [ ] **Step 2: connect-channel.ts에 한도 체크 추가 + channelId 리턴**

`src/lib/youtube/connect-channel.ts` 전체를 아래로 교체:

```ts
import "server-only";

import { encrypt } from "@/lib/crypto/token-cipher";
import { getChannelsByUserId, upsertChannel } from "@/lib/db/queries/channels";
import {
  FREE_CHANNEL_LIMIT,
  getSubscriptionByUserId,
  PLAN_CHANNEL_LIMITS,
} from "@/lib/db/queries/subscriptions";

export class ChannelLimitError extends Error {}

type YouTubeChannelsResponse = {
  items?: Array<{
    id: string;
    snippet: {
      title: string;
      thumbnails?: { default?: { url?: string } };
    };
    statistics?: { subscriberCount?: string; hiddenSubscriberCount?: boolean };
    contentDetails?: { relatedPlaylists?: { uploads?: string } };
  }>;
};

type ConnectChannelInput = {
  userId: string;
  accessToken: string;
  refreshToken: string | null;
};

// 반환값: 연동/갱신된 채널의 id — 호출부가 그 채널로 바로 이동시키는 데 쓴다
export async function connectChannel({
  userId,
  accessToken,
  refreshToken,
}: ConnectChannelInput): Promise<string> {
  const response = await fetch(
    "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&mine=true",
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!response.ok) {
    throw new Error(`YouTube API 채널 조회 실패 (${response.status})`);
  }

  const data: YouTubeChannelsResponse = await response.json();
  const channel = data.items?.[0];

  if (!channel) {
    throw new Error("연동된 구글 계정에 연결된 유튜브 채널이 없습니다.");
  }

  const existingChannels = await getChannelsByUserId(userId);
  const isNewChannel = !existingChannels.some(
    (c) => c.youtubeChannelId === channel.id,
  );

  // 이미 연동된 채널의 재인증(토큰 갱신)은 한도와 무관하게 항상 허용한다.
  // 진짜 새 채널을 추가하는 경우에만 플랜 한도를 체크한다.
  if (isNewChannel) {
    const subscription = await getSubscriptionByUserId(userId);
    const limit = subscription
      ? PLAN_CHANNEL_LIMITS[subscription.plan]
      : FREE_CHANNEL_LIMIT;
    const activeCount = existingChannels.filter(
      (c) => c.status === "active",
    ).length;

    if (activeCount >= limit) {
      throw new ChannelLimitError(
        `현재 플랜에서는 채널을 ${limit}개까지만 연동할 수 있습니다.`,
      );
    }
  }

  return upsertChannel({
    userId,
    youtubeChannelId: channel.id,
    channelTitle: channel.snippet.title,
    thumbnailUrl: channel.snippet.thumbnails?.default?.url ?? null,
    subscriberCount:
      channel.statistics?.subscriberCount != null
        ? Number(channel.statistics.subscriberCount)
        : null,
    uploadsPlaylistId:
      channel.contentDetails?.relatedPlaylists?.uploads ?? null,
    encryptedRefreshToken: refreshToken ? encrypt(refreshToken) : undefined,
  });
}
```

- [ ] **Step 3: channel-connect/start/route.ts에 사전 한도 체크 추가**

`src/app/channel-connect/start/route.ts`에서 (전체 파일은 45줄, 기존 auth 체크 바로 다음에
아래 블록을 추가):

```ts
if (!user) {
  return NextResponse.redirect(new URL("/", request.url));
}

const existingChannels = await getChannelsByUserId(user.id);
const subscription = await getSubscriptionByUserId(user.id);
const limit = subscription
  ? PLAN_CHANNEL_LIMITS[subscription.plan]
  : FREE_CHANNEL_LIMIT;
const activeCount = existingChannels.filter((c) => c.status === "active").length;

if (activeCount >= limit) {
  return NextResponse.redirect(
    new URL("/mypage/account?error=channel_limit", request.url),
  );
}

const state = crypto.randomUUID();
```

(마지막 줄 `const state = crypto.randomUUID();`는 기존에 있던 줄 — 그 앞에 한도 체크 블록을
끼워 넣는 것) 파일 상단 import에 추가:

```ts
import { getChannelsByUserId } from "@/lib/db/queries/channels";
import {
  FREE_CHANNEL_LIMIT,
  getSubscriptionByUserId,
  PLAN_CHANNEL_LIMITS,
} from "@/lib/db/queries/subscriptions";
```

이건 UX용 사전 체크일 뿐이고(불필요한 구글 왕복 방지), 실제 최종 방어는 Step 2의
`connectChannel` 내부 체크다.

- [ ] **Step 4: channel-connect/callback/route.ts 수정 — channelId로 리다이렉트, 한도 초과 에러 구분**

`src/app/channel-connect/callback/route.ts` 전체를 아래로 교체:

```ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { ChannelLimitError, connectChannel } from "@/lib/youtube/connect-channel";
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
    const channelId = await connectChannel({
      userId: user.id,
      accessToken,
      refreshToken,
    });
    return NextResponse.redirect(`${origin}/c/${channelId}/dashboard`);
  } catch (e) {
    if (e instanceof ChannelLimitError) {
      return NextResponse.redirect(
        `${origin}/mypage/account?error=channel_limit`,
      );
    }
    console.error("채널 연동 실패:", e);
    return NextResponse.redirect(`${origin}/onboarding?error=channel_connect`);
  }
}
```

- [ ] **Step 5: 타입체크 및 린트**

Run: `npx tsc --noEmit && npm run lint`
Expected: 이 4개 파일 관련 에러 없음 (다른 파일들의 기존 에러는 아직 남아있을 수 있음 — 이후
태스크에서 해소)

- [ ] **Step 6: 커밋**

```bash
git add src/lib/db/queries/subscriptions.ts src/lib/youtube/connect-channel.ts src/app/channel-connect
git commit -m "feat: 채널 연동 시 플랜 한도 체크 및 channelId 기반 리다이렉트"
```

---

## Task 5: comments.ts + sync-comments.ts — channelId로 전환

**Files:**
- Modify: `src/lib/db/queries/comments.ts`
- Modify: `src/lib/youtube/sync-comments.ts`

**Interfaces:**
- Consumes: `comments.channelId` (Task 2)
- Produces: `comments.ts`의 모든 채널 종속 함수가 `channelId: string`을 받도록 변경. Task 6
  (notifications.ts/analyze-pending-comments.ts)과 Task 8(페이지들)이 이 시그니처를 그대로
  가져다 쓴다.

- [ ] **Step 1: comments.ts 전체를 아래로 교체**

```ts
import "server-only";

import { and, eq, gte, ilike, isNull, lt, sql, type SQL } from "drizzle-orm";

import {
  MODEL,
  PROMPT_VERSION,
  type CommentAnalysis,
} from "@/lib/ai/analyze-comment";
import { db } from "@/lib/db";
import { comments } from "@/lib/db/schema";

type NewCommentInput = {
  userId: string;
  channelId: string;
  videoId: string;
  videoTitle: string | null;
  videoType: "video" | "shorts" | null;
  youtubeCommentId: string;
  authorChannelId: string;
  authorDisplayName: string | null;
  text: string;
  createdAt: Date;
};

export async function insertNewComments(rows: NewCommentInput[]) {
  if (rows.length === 0) return 0;

  const inserted = await db
    .insert(comments)
    .values(rows)
    .onConflictDoNothing({
      target: [comments.platform, comments.youtubeCommentId],
    })
    .returning({ id: comments.id });

  return inserted.length;
}

export async function countCommentsByUserId(userId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(comments)
    .where(eq(comments.userId, userId));

  return row?.count ?? 0;
}

export async function countUnanalyzedCommentsByUserId(userId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(comments)
    .where(and(eq(comments.userId, userId), isNull(comments.analyzedAt)));

  return row?.count ?? 0;
}

// 반복 작성자 구독 제안 알림에 쓰는 누적 악성 댓글 수
export async function countMaliciousCommentsByAuthor(
  channelId: string,
  authorChannelId: string,
) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(comments)
    .where(
      and(
        eq(comments.channelId, channelId),
        eq(comments.authorChannelId, authorChannelId),
        eq(comments.isMalicious, true),
      ),
    );

  return row?.count ?? 0;
}

// 주간 다이제스트 알림에 쓰는 기간별 악성 댓글 수 (from 이상, to 미만)
export async function countMaliciousCommentsInRange(
  channelId: string,
  from: Date,
  to: Date,
) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(comments)
    .where(
      and(
        eq(comments.channelId, channelId),
        eq(comments.isMalicious, true),
        gte(comments.createdAt, from),
        lt(comments.createdAt, to),
      ),
    );

  return row?.count ?? 0;
}

// 주간 요약 페이지에 쓰는 기간별 위험도 분해 (from 이상, to 미만)
export async function getRiskBreakdownInRange(
  channelId: string,
  from: Date,
  to: Date,
) {
  const rows = await db
    .select({
      riskLevel: comments.riskLevel,
      count: sql<number>`count(*)::int`,
    })
    .from(comments)
    .where(
      and(
        eq(comments.channelId, channelId),
        eq(comments.isMalicious, true),
        gte(comments.createdAt, from),
        lt(comments.createdAt, to),
      ),
    )
    .groupBy(comments.riskLevel);

  const breakdown = { high: 0, medium: 0, low: 0 };
  for (const row of rows) {
    if (row.riskLevel === "high") breakdown.high = row.count;
    if (row.riskLevel === "medium") breakdown.medium = row.count;
    if (row.riskLevel === "low") breakdown.low = row.count;
  }
  return breakdown;
}

// 대시보드 추이 스파크라인용 — 기간 내 일별 악성 댓글 건수 (일자 오름차순)
export async function getDailyMaliciousCounts(
  channelId: string,
  from: Date,
  to: Date,
) {
  const dayExpr = sql<string>`date_trunc('day', ${comments.createdAt})`;

  return db
    .select({
      day: dayExpr,
      count: sql<number>`count(*)::int`,
    })
    .from(comments)
    .where(
      and(
        eq(comments.channelId, channelId),
        eq(comments.isMalicious, true),
        gte(comments.createdAt, from),
        lt(comments.createdAt, to),
      ),
    )
    .groupBy(dayExpr)
    .orderBy(dayExpr);
}

// 대시보드 "요주의 작성자" 위젯용 — 악성 댓글 수 기준 상위 작성자.
// from을 안 넘기면 누적 전체 기간, 넘기면 해당 시점 이후로 범위를 좁힌다.
export async function getTopAuthorsByMaliciousCount(
  channelId: string,
  limit: number,
  from?: Date,
) {
  const conditions = [
    eq(comments.channelId, channelId),
    eq(comments.isMalicious, true),
  ];
  if (from) conditions.push(gte(comments.createdAt, from));

  return db
    .select({
      authorChannelId: comments.authorChannelId,
      authorDisplayName: sql<string | null>`max(${comments.authorDisplayName})`,
      count: sql<number>`count(*)::int`,
    })
    .from(comments)
    .where(and(...conditions))
    .groupBy(comments.authorChannelId)
    .orderBy(sql`count(*) desc`)
    .limit(limit);
}

// 대시보드 "최근 악성 댓글 몰린 영상" 위젯용 — 기간 내 영상별 악성 댓글 수 상위
export async function getTopVideosByMaliciousCount(
  channelId: string,
  from: Date,
  limit: number,
) {
  return db
    .select({
      videoId: comments.videoId,
      videoTitle: sql<string | null>`max(${comments.videoTitle})`,
      videoType: sql<string | null>`max(${comments.videoType})`,
      count: sql<number>`count(*)::int`,
    })
    .from(comments)
    .where(
      and(
        eq(comments.channelId, channelId),
        eq(comments.isMalicious, true),
        gte(comments.createdAt, from),
      ),
    )
    .groupBy(comments.videoId)
    .orderBy(sql`count(*) desc`)
    .limit(limit);
}

export async function getUnanalyzedComments(channelId: string, limit: number) {
  return db
    .select()
    .from(comments)
    .where(and(eq(comments.channelId, channelId), isNull(comments.analyzedAt)))
    .limit(limit);
}

export async function getDashboardSummary(channelId: string) {
  const rows = await db
    .select({
      riskLevel: comments.riskLevel,
      status: comments.status,
      count: sql<number>`count(*)::int`,
    })
    .from(comments)
    .where(and(eq(comments.channelId, channelId), eq(comments.isMalicious, true)))
    .groupBy(comments.riskLevel, comments.status);

  const summary = { total: 0, high: 0, medium: 0, low: 0, needsReview: 0 };
  for (const row of rows) {
    summary.total += row.count;
    if (row.riskLevel === "high") summary.high += row.count;
    if (row.riskLevel === "medium") summary.medium += row.count;
    if (row.riskLevel === "low") summary.low += row.count;
    if (row.status === "needs_review") summary.needsReview += row.count;
  }
  return summary;
}

export type CommentRiskLevel = "high" | "medium" | "low";

export type CommentFilters = {
  riskLevel?: CommentRiskLevel;
  category?: string;
  status?: "confirmed" | "needs_review" | "reported_false" | "whitelisted";
  videoId?: string;
  search?: string;
  author?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: "newest" | "risk";
};

function buildFlaggedConditions(channelId: string, filters: CommentFilters) {
  const conditions = [
    eq(comments.channelId, channelId),
    eq(comments.isMalicious, true),
  ];

  if (filters.riskLevel) conditions.push(eq(comments.riskLevel, filters.riskLevel));
  if (filters.category) conditions.push(eq(comments.category, filters.category));
  if (filters.status) conditions.push(eq(comments.status, filters.status));
  if (filters.videoId) conditions.push(eq(comments.videoId, filters.videoId));
  if (filters.search) conditions.push(ilike(comments.text, `%${filters.search}%`));
  if (filters.author)
    conditions.push(ilike(comments.authorDisplayName, `%${filters.author}%`));
  // dateFrom/dateTo는 "YYYY-MM-DD" 문자열. from은 그 날 00시 이상, to는 다음 날
  // 00시 미만으로 잡아 선택한 날짜 하루 전체가 포함되게 한다.
  if (filters.dateFrom)
    conditions.push(gte(comments.createdAt, new Date(`${filters.dateFrom}T00:00:00`)));
  if (filters.dateTo) {
    const to = new Date(`${filters.dateTo}T00:00:00`);
    to.setDate(to.getDate() + 1);
    conditions.push(lt(comments.createdAt, to));
  }

  return conditions;
}

export async function getFlaggedComments(
  channelId: string,
  filters: CommentFilters,
  page: number,
  pageSize: number,
) {
  const conditions = buildFlaggedConditions(channelId, filters);

  const orderBy: SQL =
    filters.sort === "risk"
      ? sql`case ${comments.riskLevel} when 'high' then 0 when 'medium' then 1 else 2 end asc, ${comments.createdAt} desc`
      : sql`${comments.createdAt} desc`;

  return db
    .select()
    .from(comments)
    .where(and(...conditions))
    .orderBy(orderBy)
    .limit(pageSize)
    .offset((page - 1) * pageSize);
}

export async function countFlaggedComments(
  channelId: string,
  filters: CommentFilters,
) {
  const conditions = buildFlaggedConditions(channelId, filters);

  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(comments)
    .where(and(...conditions));

  return row?.count ?? 0;
}

export async function getFlaggedFilterOptions(channelId: string) {
  const rows = await db
    .selectDistinct({
      category: comments.category,
      videoId: comments.videoId,
      videoTitle: comments.videoTitle,
    })
    .from(comments)
    .where(and(eq(comments.channelId, channelId), eq(comments.isMalicious, true)));

  const categories = Array.from(
    new Set(rows.map((r) => r.category).filter((c): c is string => c !== null)),
  );
  const videos = Array.from(
    new Map(rows.map((r) => [r.videoId, r.videoTitle])).entries(),
  ).map(([videoId, videoTitle]) => ({ videoId, videoTitle }));

  return { categories, videos };
}

export async function getCommentsByAuthor(
  channelId: string,
  authorChannelId: string,
) {
  return db
    .select()
    .from(comments)
    .where(
      and(
        eq(comments.channelId, channelId),
        eq(comments.authorChannelId, authorChannelId),
        eq(comments.isMalicious, true),
      ),
    )
    .orderBy(sql`${comments.createdAt} desc`);
}

export async function getReviewQueue(channelId: string) {
  return db
    .select()
    .from(comments)
    .where(
      and(eq(comments.channelId, channelId), eq(comments.status, "needs_review")),
    )
    .orderBy(sql`${comments.confidence} asc nulls last`);
}

export async function countReviewQueue(channelId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(comments)
    .where(
      and(eq(comments.channelId, channelId), eq(comments.status, "needs_review")),
    );

  return row?.count ?? 0;
}

type CommentStatus = "confirmed" | "needs_review" | "reported_false" | "whitelisted";

// 해당 채널 소유 댓글만 수정 가능하도록 channelId까지 조건에 걸어 확인한다
export async function updateCommentStatus(
  commentId: string,
  channelId: string,
  status: CommentStatus,
) {
  const updated = await db
    .update(comments)
    .set({ status, isHumanReviewed: true })
    .where(and(eq(comments.id, commentId), eq(comments.channelId, channelId)))
    .returning({ id: comments.id });

  return updated.length > 0;
}

export async function deleteCommentsByUserId(userId: string) {
  await db.delete(comments).where(eq(comments.userId, userId));
}

export async function saveAnalysisResult(
  commentId: string,
  analysis: CommentAnalysis,
) {
  // is_malicious=false → whitelisted(AI가 정상으로 판단, 검토 큐에 안 쌓임)
  // is_malicious=true && confidence>=0.7 → confirmed (자동 확정)
  // is_malicious=true && confidence<0.7 → needs_review (오탐 관리 원칙, 사람이 확인)
  const status = !analysis.is_malicious
    ? ("whitelisted" as const)
    : analysis.confidence >= 0.7
      ? ("confirmed" as const)
      : ("needs_review" as const);

  await db
    .update(comments)
    .set({
      isMalicious: analysis.is_malicious,
      riskLevel: analysis.risk_level,
      category: analysis.category,
      confidence: analysis.confidence.toFixed(2),
      reason: analysis.reason,
      aiModel: MODEL,
      promptVersion: PROMPT_VERSION,
      status,
      analyzedAt: new Date(),
    })
    .where(eq(comments.id, commentId));
}
```

`countCommentsByUserId`/`countUnanalyzedCommentsByUserId`는 지금 아무 데서도 안 쓰이는
죽은 코드지만, 이번 태스크 범위가 아니라서 그대로 둔다(userId 기준 그대로 유지).
`deleteCommentsByUserId`도 계정 삭제 전용이라 userId 기준 그대로 유지한다.

- [ ] **Step 2: sync-comments.ts에서 채널 댓글 저장 시 channelId 포함**

`src/lib/youtube/sync-comments.ts`의 `toRow` 함수:

```ts
    const toRow = (id: string, snippet: YouTubeCommentSnippet) => ({
      userId: channel.userId,
      videoId,
```

를

```ts
    const toRow = (id: string, snippet: YouTubeCommentSnippet) => ({
      userId: channel.userId,
      channelId: channel.id,
      videoId,
```

로 바꾼다.

- [ ] **Step 3: 타입체크**

Run: `npx tsc --noEmit`
Expected: `comments.ts`와 `sync-comments.ts` 관련 에러 없음. 이 두 파일을 호출하는 페이지들
(dashboard/comments/review/summary/authors 등)은 아직 옛 시그니처(`userId`)로 호출하고 있어
타입 에러가 남아있을 수 있음 — Task 8에서 전부 고친다.

- [ ] **Step 4: 커밋**

```bash
git add src/lib/db/queries/comments.ts src/lib/youtube/sync-comments.ts
git commit -m "feat: 댓글 쿼리 함수를 channelId 기준으로 전환"
```

---

## Task 6: notifications.ts + analyze-pending-comments.ts + cron — channelId로 전환

**Files:**
- Modify: `src/lib/db/queries/notifications.ts`
- Modify: `src/lib/ai/analyze-pending-comments.ts`
- Modify: `src/app/api/cron/process-comments/route.ts`

**Interfaces:**
- Consumes: `notifications.channelId`/`authorSubscriptions.channelId` (Task 2),
  `countMaliciousCommentsByAuthor`/`countMaliciousCommentsInRange`/`countReviewQueue`/
  `getUnanalyzedComments`/`saveAnalysisResult` (Task 5, 이미 channelId 기준)
- Produces: `notifications.ts`의 모든 함수가 `channelId: string`을 받도록 변경 (href도
  channelId를 포함하도록), `analyzePendingComments(channelId, userId)`,
  `maybeCreateWeeklyDigest(channelId)` — Task 8(페이지들)과 Task 9가 이 시그니처를 가져다 쓴다

- [ ] **Step 1: notifications.ts 전체를 아래로 교체**

```ts
import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";

import {
  countMaliciousCommentsByAuthor,
  countMaliciousCommentsInRange,
} from "@/lib/db/queries/comments";
import { db } from "@/lib/db";
import { authorSubscriptions, comments, notifications } from "@/lib/db/schema";

type NotificationType =
  | "new_comment"
  | "repeat_author"
  | "review_backlog"
  | "video_spike"
  | "weekly_digest"
  | "payment_failed"
  | "payment_downgraded";

// 낮은 것부터 순서대로 확인 — 한 번의 분석에서 여러 단계를 한꺼번에 넘겨도
// (예: 갑자기 댓글이 몰려 2건→11건) 안 보낸 단계는 전부 각각 알려준다.
const REPEAT_AUTHOR_THRESHOLDS = [3, 10, 30] as const;
const VIDEO_SPIKE_THRESHOLD = 3;
const REVIEW_BACKLOG_THRESHOLD = 5;
const WEEKLY_DIGEST_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

export async function isSubscribedToAuthor(
  channelId: string,
  authorChannelId: string,
) {
  const [row] = await db
    .select({ id: authorSubscriptions.id })
    .from(authorSubscriptions)
    .where(
      and(
        eq(authorSubscriptions.channelId, channelId),
        eq(authorSubscriptions.authorChannelId, authorChannelId),
      ),
    )
    .limit(1);

  return Boolean(row);
}

export async function subscribeToAuthor(
  userId: string,
  channelId: string,
  authorChannelId: string,
  authorDisplayName: string | null,
) {
  await db
    .insert(authorSubscriptions)
    .values({ userId, channelId, authorChannelId, authorDisplayName })
    .onConflictDoNothing({
      target: [authorSubscriptions.channelId, authorSubscriptions.authorChannelId],
    });
}

export async function getAuthorSubscriptions(channelId: string) {
  return db
    .select({
      authorChannelId: authorSubscriptions.authorChannelId,
      authorDisplayName: authorSubscriptions.authorDisplayName,
      createdAt: authorSubscriptions.createdAt,
    })
    .from(authorSubscriptions)
    .where(eq(authorSubscriptions.channelId, channelId))
    .orderBy(desc(authorSubscriptions.createdAt));
}

export async function unsubscribeFromAuthor(
  channelId: string,
  authorChannelId: string,
) {
  await db
    .delete(authorSubscriptions)
    .where(
      and(
        eq(authorSubscriptions.channelId, channelId),
        eq(authorSubscriptions.authorChannelId, authorChannelId),
      ),
    );
}

async function hasUnreadNotificationOfType(
  channelId: string,
  type: NotificationType,
  refId?: string,
) {
  const conditions = [
    eq(notifications.channelId, channelId),
    eq(notifications.type, type),
    eq(notifications.isRead, false),
  ];
  if (refId) conditions.push(eq(notifications.refId, refId));

  const [row] = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(...conditions))
    .limit(1);

  return Boolean(row);
}

// repeat_author처럼 "평생 한 번만" 제안해야 하는 타입용 — 읽음 여부와 무관하게
// 과거에 한 번이라도 만들어진 적 있으면 다시 만들지 않는다.
async function hasEverNotifiedOfType(
  channelId: string,
  type: NotificationType,
  refId: string,
) {
  const [row] = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(
      and(
        eq(notifications.channelId, channelId),
        eq(notifications.type, type),
        eq(notifications.refId, refId),
      ),
    )
    .limit(1);

  return Boolean(row);
}

// cron 분석 파이프라인 전용 — 구독 중인 작성자의 새 악성 댓글 알림.
// 호출 전에 isSubscribedToAuthor로 이미 구독 여부를 확인했다고 가정한다.
export async function createNewCommentNotification(
  userId: string,
  channelId: string,
  commentId: string,
  authorChannelId: string,
) {
  await db.insert(notifications).values({
    userId,
    channelId,
    type: "new_comment",
    commentId,
    href: `/c/${channelId}/authors/${encodeURIComponent(authorChannelId)}`,
  });
}

function repeatAuthorRefId(authorChannelId: string, threshold: number) {
  return `${authorChannelId}:${threshold}`;
}

function repeatAuthorMessage(
  authorDisplayName: string | null,
  threshold: number,
): string {
  const name = authorDisplayName ?? "이 작성자";
  if (threshold >= 30) {
    return `${name}님이 누적 ${threshold}번째 악성 댓글을 남겼어요. 매우 심각한 수준으로 반복되고 있습니다.`;
  }
  if (threshold >= 10) {
    return `${name}님이 누적 ${threshold}번째 악성 댓글을 남겼어요. 반복적으로 문제를 일으키고 있습니다.`;
  }
  return `${name}님이 벌써 ${threshold}번째 악성 댓글을 남겼어요. 알림을 받아볼까요?`;
}

// 아직 구독 안 한 작성자가 누적 악성 댓글 수가 REPEAT_AUTHOR_THRESHOLDS의
// 각 단계(3/10/30건)를 넘길 때마다 한 번씩 알린다. count === 임계치인
// "바로 그 순간"에만 걸리는 방식이었더니 (1) 그 순간 일시적으로 구독
// 중이었거나 (2) 이 기능이 생기기 전에 이미 임계치를 넘겨버린 작성자는
// 평생 못 잡는 문제가 있어서, refId(작성자ID+단계) 기준으로 "이 단계를
// 한 번이라도 보낸 적 있는지"를 직접 확인하는 방식으로 바꿨다.
export async function maybeSuggestAuthorSubscription(
  userId: string,
  channelId: string,
  authorChannelId: string,
  authorDisplayName: string | null,
) {
  const count = await countMaliciousCommentsByAuthor(channelId, authorChannelId);

  for (const threshold of REPEAT_AUTHOR_THRESHOLDS) {
    if (count < threshold) break; // 오름차순이라 여기서 못 넘으면 그 위 단계도 못 넘은 것

    const refId = repeatAuthorRefId(authorChannelId, threshold);
    if (await hasEverNotifiedOfType(channelId, "repeat_author", refId)) continue;

    await db.insert(notifications).values({
      userId,
      channelId,
      type: "repeat_author",
      title: "반복 작성자 발견",
      message: repeatAuthorMessage(authorDisplayName, threshold),
      href: `/c/${channelId}/authors/${encodeURIComponent(authorChannelId)}`,
      refId,
    });
  }
}

// 한 번의 분석 배치 안에서 특정 영상에 VIDEO_SPIKE_THRESHOLD건 이상 악성 댓글이
// 몰렸을 때. 같은 영상에 대해 안읽은 알림이 이미 있으면 또 만들지 않는다.
export async function maybeNotifyVideoSpike(
  userId: string,
  channelId: string,
  videoId: string,
  videoTitle: string | null,
  count: number,
) {
  if (count < VIDEO_SPIKE_THRESHOLD) return;
  if (await hasUnreadNotificationOfType(channelId, "video_spike", videoId)) return;

  await db.insert(notifications).values({
    userId,
    channelId,
    type: "video_spike",
    title: "영상에 악성 댓글이 몰리고 있어요",
    message: `"${videoTitle ?? videoId}" 영상에 최근 ${count}건의 악성 댓글이 발생했습니다.`,
    href: `/c/${channelId}/dashboard?video=${encodeURIComponent(videoId)}`,
    refId: videoId,
  });
}

// 검토 필요 큐가 REVIEW_BACKLOG_THRESHOLD건 이상 쌓였을 때. 안읽은 알림이
// 이미 있으면 다시 만들지 않고, 읽고 나서 다시 임계치를 넘으면 또 알린다.
export async function maybeNotifyReviewBacklog(
  userId: string,
  channelId: string,
  backlogCount: number,
) {
  if (backlogCount < REVIEW_BACKLOG_THRESHOLD) return;
  if (await hasUnreadNotificationOfType(channelId, "review_backlog")) return;

  await db.insert(notifications).values({
    userId,
    channelId,
    type: "review_backlog",
    title: "검토 필요 댓글이 쌓이고 있어요",
    message: `확신도가 낮아 검토가 필요한 댓글이 ${backlogCount}건입니다.`,
    href: `/c/${channelId}/review`,
  });
}

function formatWeeklyDiff(thisWeek: number, lastWeek: number): string {
  if (lastWeek === 0) {
    return thisWeek === 0 ? "지난주와 동일" : `${thisWeek}건 증가`;
  }
  const diff = thisWeek - lastWeek;
  if (diff === 0) return "지난주와 동일";
  const percent = Math.round((diff / lastWeek) * 100);
  return `${percent > 0 ? "+" : ""}${percent}%`;
}

// cron이 매시간 돌 때마다 호출되지만, 최근 생성된 weekly_digest 알림이
// 7일 이내면 그냥 넘어간다 — 별도 주간 전용 cron 없이 기존 시간별 cron
// 안에서 "때가 됐을 때만" 실행되는 방식.
export async function maybeCreateWeeklyDigest(userId: string, channelId: string) {
  const [latest] = await db
    .select({ createdAt: notifications.createdAt })
    .from(notifications)
    .where(
      and(
        eq(notifications.channelId, channelId),
        eq(notifications.type, "weekly_digest"),
      ),
    )
    .orderBy(desc(notifications.createdAt))
    .limit(1);

  const now = new Date();
  if (latest && now.getTime() - latest.createdAt.getTime() < WEEKLY_DIGEST_INTERVAL_MS) {
    return;
  }

  const oneWeekAgo = new Date(now.getTime() - WEEKLY_DIGEST_INTERVAL_MS);
  const twoWeeksAgo = new Date(now.getTime() - WEEKLY_DIGEST_INTERVAL_MS * 2);
  const [thisWeek, lastWeek] = await Promise.all([
    countMaliciousCommentsInRange(channelId, oneWeekAgo, now),
    countMaliciousCommentsInRange(channelId, twoWeeksAgo, oneWeekAgo),
  ]);

  // 첫 주(비교 대상 없음)인데 이번 주도 0건이면 보낼 내용이 없으니 생략
  if (thisWeek === 0 && lastWeek === 0) return;

  await db.insert(notifications).values({
    userId,
    channelId,
    type: "weekly_digest",
    title: "이번 주 요약",
    message: `이번 주 위험 댓글 ${thisWeek}건 (지난주 대비 ${formatWeeklyDiff(thisWeek, lastWeek)})`,
    href: `/c/${channelId}/summary`,
  });
}

export async function countUnreadNotifications(channelId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.channelId, channelId), eq(notifications.isRead, false)));

  return row?.count ?? 0;
}

export async function getNotifications(channelId: string, limit?: number) {
  const query = db
    .select({
      id: notifications.id,
      type: notifications.type,
      isRead: notifications.isRead,
      createdAt: notifications.createdAt,
      title: notifications.title,
      message: notifications.message,
      href: notifications.href,
      commentText: comments.text,
      riskLevel: comments.riskLevel,
      category: comments.category,
      authorDisplayName: comments.authorDisplayName,
      videoId: comments.videoId,
      videoTitle: comments.videoTitle,
    })
    .from(notifications)
    .leftJoin(comments, eq(notifications.commentId, comments.id))
    .where(eq(notifications.channelId, channelId))
    .orderBy(desc(notifications.createdAt));

  return limit ? query.limit(limit) : query;
}

export async function markNotificationRead(id: string, channelId: string) {
  const updated = await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, id), eq(notifications.channelId, channelId)))
    .returning({ id: notifications.id });

  return updated.length > 0;
}

export async function markAllNotificationsRead(channelId: string) {
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.channelId, channelId), eq(notifications.isRead, false)));
}

function formatDate(date: Date): string {
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

// 결제 알림은 채널이 아니라 계정(userId) 단위 — subscriptions가 userId 기준이라
// channelId 개념이 없다. 프론트에서 channelId 없이도 /mypage/subscription으로
// 보여줄 수 있게 href를 절대경로로 고정한다.
export async function notifyPaymentFailed(userId: string, retryAt: Date) {
  await db.insert(notifications).values({
    userId,
    type: "payment_failed",
    title: "결제에 실패했어요",
    message: `카드 결제가 실패했습니다. ${formatDate(retryAt)}에 다시 시도됩니다. 카드 정보를 확인해 주세요.`,
    href: "/mypage/subscription",
  });
}

export async function notifyPaymentDowngraded(userId: string) {
  await db.insert(notifications).values({
    userId,
    type: "payment_downgraded",
    title: "무료 플랜으로 전환되었습니다",
    message: "재시도 결제도 실패해 무료 플랜으로 전환됐어요. 다시 구독하려면 결제 정보를 등록해 주세요.",
    href: "/mypage/subscription",
  });
}

// 계정 삭제 시 함께 정리한다
export async function deleteNotificationsByUserId(userId: string) {
  await db.delete(notifications).where(eq(notifications.userId, userId));
  await db
    .delete(authorSubscriptions)
    .where(eq(authorSubscriptions.userId, userId));
}
```

**중요:** `notifyPaymentFailed`/`notifyPaymentDowngraded`는 `notifications.channelId`가
NOT NULL인데 여기선 `channelId`를 안 넣는다 — 결제는 계정(userId) 단위 개념이라 특정
채널이랑 안 묶인다. 이 두 함수는 **channelId 없이 insert하면 DB 제약 위반으로 에러난다.**
아래 Step 2에서 이 문제를 해결한다.

- [ ] **Step 2: notifications.channelId를 nullable로 되돌리기 (결제 알림은 채널 무관이라 예외)**

Step 1에서 발견한 문제 — 결제 알림(`payment_failed`/`payment_downgraded`)은 특정 채널에
안 묶이는 유일한 알림 타입이다. `src/lib/db/schema.ts`의 `notifications` 테이블에서:

```ts
  channelId: uuid("channel_id").notNull(),
```

를

```ts
  // payment_failed/payment_downgraded만 예외적으로 null (계정 단위 알림이라 특정
  // 채널에 안 묶임). 그 외 타입은 전부 채널 종속이라 애플리케이션 레벨에서 항상 채움.
  channelId: uuid("channel_id"),
```

로 되돌린다(nullable). 그리고 `getNotifications`/`countUnreadNotifications`/
`markNotificationRead`/`markAllNotificationsRead`는 여전히 channelId로 필터링하므로
결제 알림은 `/c/[channelId]/...` 화면의 알림벨에는 안 뜨고 헤더 알림벨과 무관하게
`/mypage/subscription` 페이지 자체에서만 확인 가능한 알림으로 남는다 — 이건 의도된 동작이다
(결제 문제는 특정 채널 맥락과 무관하니까).

Run: `npx tsc --noEmit`, `npm run db:generate && npm run db:migrate`
Expected: `notifications.channel_id`를 다시 nullable로 바꾸는 마이그레이션 생성/적용, 에러
없음

- [ ] **Step 3: analyze-pending-comments.ts를 channelId 기준으로 수정**

`src/lib/ai/analyze-pending-comments.ts` 전체를 아래로 교체:

```ts
import "server-only";

import { analyzeComment } from "@/lib/ai/analyze-comment";
import {
  countReviewQueue,
  getUnanalyzedComments,
  saveAnalysisResult,
} from "@/lib/db/queries/comments";
import {
  createNewCommentNotification,
  isSubscribedToAuthor,
  maybeNotifyReviewBacklog,
  maybeNotifyVideoSpike,
  maybeSuggestAuthorSubscription,
} from "@/lib/db/queries/notifications";

// 한 번의 배치가 쓰는 OpenAI 호출 수 상한 (비용 방어). cron이 시간마다 도니까
// 최대 하루 24회 × 20개 = 480개가 자연스러운 상한이라 별도 일일 카운터는 안 둔다.
const MAX_BATCH = 20;

export async function analyzePendingComments(userId: string, channelId: string) {
  const pending = await getUnanalyzedComments(channelId, MAX_BATCH);

  let analyzed = 0;
  let failed = 0;
  // 이번 배치 안에서 영상별로 몇 건이 악성으로 나왔는지 — 배치가 끝난 뒤
  // 영상 저격(video_spike) 알림 여부를 판단하는 데 쓴다.
  const videoMaliciousCounts = new Map<
    string,
    { count: number; videoTitle: string | null }
  >();

  for (const comment of pending) {
    try {
      const result = await analyzeComment(comment.text);
      await saveAnalysisResult(comment.id, result);

      if (result.is_malicious) {
        const subscribed = await isSubscribedToAuthor(
          channelId,
          comment.authorChannelId,
        );
        if (subscribed) {
          await createNewCommentNotification(
            userId,
            channelId,
            comment.id,
            comment.authorChannelId,
          );
        } else {
          await maybeSuggestAuthorSubscription(
            userId,
            channelId,
            comment.authorChannelId,
            comment.authorDisplayName,
          );
        }

        const entry = videoMaliciousCounts.get(comment.videoId) ?? {
          count: 0,
          videoTitle: comment.videoTitle,
        };
        entry.count += 1;
        videoMaliciousCounts.set(comment.videoId, entry);
      }
      analyzed++;
    } catch (e) {
      console.error(`댓글 분석 실패 (id=${comment.id}):`, e);
      failed++;
    }
  }

  for (const [videoId, { count, videoTitle }] of videoMaliciousCounts) {
    await maybeNotifyVideoSpike(userId, channelId, videoId, videoTitle, count);
  }

  const backlogCount = await countReviewQueue(channelId);
  await maybeNotifyReviewBacklog(userId, channelId, backlogCount);

  return { totalPending: pending.length, analyzed, failed };
}
```

- [ ] **Step 4: process-comments cron 호출부 수정**

`src/app/api/cron/process-comments/route.ts`에서:

```ts
    try {
      entry.analyze = await analyzePendingComments(channel.userId);
    } catch (e) {
```

를

```ts
    try {
      entry.analyze = await analyzePendingComments(channel.userId, channel.id);
    } catch (e) {
```

로, 그리고:

```ts
    try {
      await maybeCreateWeeklyDigest(channel.userId);
    } catch (e) {
```

를

```ts
    try {
      await maybeCreateWeeklyDigest(channel.userId, channel.id);
    } catch (e) {
```

로 바꾼다. (파일 안에 이 두 호출부가 각각 한 번씩만 있다 — `for (const channel of channels)`
루프 안)

- [ ] **Step 5: author-comment-feed.tsx / subscription API 라우트의 subscribeToAuthor 호출부는
      Task 8에서 함께 수정 (channelId 스레딩이 페이지 이동과 묶여있음) — 지금은 건드리지 않는다**

- [ ] **Step 6: 타입체크**

Run: `npx tsc --noEmit`
Expected: `notifications.ts`/`analyze-pending-comments.ts`/`process-comments/route.ts` 관련
에러 없음. `subscribeToAuthor`/`isSubscribedToAuthor`를 옛 시그니처로 호출하는
`author-comment-feed.tsx`나 subscription API 라우트 쪽은 아직 에러가 남아있을 수 있음 (Task
8에서 해소)

- [ ] **Step 7: 커밋**

```bash
git add src/lib/db/queries/notifications.ts src/lib/db/schema.ts drizzle/ src/lib/ai/analyze-pending-comments.ts src/app/api/cron/process-comments/route.ts
git commit -m "feat: 알림/분석 파이프라인을 channelId 기준으로 전환"
```

---

## Task 7: AppSidebar + SidebarNav — 멀티채널 대응 컴포넌트 재작성

**Files:**
- Modify: `src/components/layout/app-sidebar.tsx`
- Modify: `src/components/layout/sidebar-nav.tsx`

**Interfaces:**
- Produces: `<AppSidebar channels activeChannelId? nickname reviewCount unreadNotificationCount />`,
  `<SidebarNav channelId? reviewCount unreadNotificationCount />` — Task 8의 새 레이아웃
  파일들이 이 컴포넌트를 가져다 쓴다. 이 태스크만으로는 아직 화면에 안 쓰인다(Task 8에서 연결).

- [ ] **Step 1: sidebar-nav.tsx 전체를 아래로 교체**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { path: "dashboard", label: "대시보드" },
  { path: "comments", label: "댓글 목록" },
  { path: "review", label: "검토 필요" },
  { path: "evidence-archive", label: "증거 보관함" },
  { path: "notifications", label: "알림" },
  { path: "summary", label: "주간 요약" },
];

const BADGE_COUNT_PATH: Record<string, "reviewCount" | "unreadNotificationCount"> = {
  review: "reviewCount",
  notifications: "unreadNotificationCount",
};

export function SidebarNav({
  channelId,
  reviewCount,
  unreadNotificationCount,
}: {
  channelId?: string;
  reviewCount: number;
  unreadNotificationCount: number;
}) {
  const pathname = usePathname();
  const counts = { reviewCount, unreadNotificationCount };

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

- [ ] **Step 2: app-sidebar.tsx 전체를 아래로 교체**

```tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Lock, Menu, Plus, X } from "lucide-react";
import { useState } from "react";

import { LogoutButton } from "@/components/auth/logout-button";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { SyncCountdown } from "@/components/layout/sync-countdown";
import { formatClockTime } from "@/lib/format/clock-time";

type SidebarChannel = {
  id: string;
  channelTitle: string;
  thumbnailUrl: string | null;
  status: "active" | "locked";
  lastSyncedAt: Date | null;
  nextSyncAt: Date;
};

export function AppSidebar({
  channels,
  activeChannelId,
  nickname,
  reviewCount,
  unreadNotificationCount,
}: {
  channels: SidebarChannel[];
  activeChannelId?: string;
  nickname: string | null;
  reviewCount: number;
  unreadNotificationCount: number;
}) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

  // 페이지 이동하면 모바일 드로어/채널 전환 드롭다운은 자동으로 닫는다 (레이아웃이
  // 라우트 전환 사이에 유지되는 공유 레이아웃이라 상태가 저절로 리셋되지 않음).
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setIsOpen(false);
    setIsSwitcherOpen(false);
  }

  const activeChannel =
    channels.find((c) => c.id === activeChannelId) ?? channels[0];
  const homeHref = activeChannel ? `/c/${activeChannel.id}/dashboard` : "/mypage";

  return (
    <>
      <header className="flex items-center justify-between border-b border-sidebar-border bg-sidebar px-4 py-3 md:hidden">
        <Link
          href={homeHref}
          className="text-lg font-semibold tracking-tight text-sidebar-foreground"
        >
          Reevely
        </Link>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="메뉴 열기"
          className="text-sidebar-foreground"
        >
          <Menu className="size-5" aria-hidden />
        </button>
      </header>

      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 -translate-x-full flex-col justify-between bg-sidebar px-4 py-5 text-sidebar-foreground transition-transform duration-200 md:static md:z-auto md:w-60 md:translate-x-0 ${
          isOpen ? "translate-x-0" : ""
        }`}
      >
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <Link
              href={homeHref}
              className="text-xl font-semibold tracking-tight"
            >
              Reevely
            </Link>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="메뉴 닫기"
              className="text-muted-foreground md:hidden"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>

          {activeChannel && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsSwitcherOpen((v) => !v)}
                aria-expanded={isSwitcherOpen}
                className="flex w-full items-center justify-between gap-2 rounded-lg border border-sidebar-border px-2.5 py-2 text-left hover:bg-sidebar-accent"
              >
                <span className="flex min-w-0 items-center gap-2">
                  {activeChannel.thumbnailUrl && (
                    <Image
                      src={activeChannel.thumbnailUrl}
                      alt={activeChannel.channelTitle}
                      width={22}
                      height={22}
                      className="rounded-full"
                    />
                  )}
                  <span className="truncate text-sm">
                    {activeChannel.channelTitle}
                  </span>
                </span>
                <ChevronDown
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
              </button>

              {isSwitcherOpen && (
                <div className="absolute top-full left-0 z-10 mt-1 w-full rounded-lg border border-sidebar-border bg-sidebar py-1 shadow-lg">
                  {channels.map((c) => (
                    <Link
                      key={c.id}
                      href={
                        c.status === "locked"
                          ? "/mypage/subscription"
                          : `/c/${c.id}/dashboard`
                      }
                      onClick={() => setIsSwitcherOpen(false)}
                      className={`flex items-center gap-2 px-3 py-2 text-sm hover:bg-sidebar-accent ${
                        c.id === activeChannel.id
                          ? "text-primary"
                          : "text-sidebar-foreground"
                      }`}
                    >
                      {c.status === "locked" && (
                        <Lock
                          className="size-3.5 shrink-0 text-muted-foreground"
                          aria-hidden
                        />
                      )}
                      <span className="truncate">{c.channelTitle}</span>
                    </Link>
                  ))}
                  <Link
                    href="/channel-connect/start"
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

          <SidebarNav
            channelId={activeChannel?.id}
            reviewCount={reviewCount}
            unreadNotificationCount={unreadNotificationCount}
          />
        </div>

        <div className="flex flex-col gap-3 border-t border-sidebar-border pt-4">
          <Link
            href="/mypage"
            className="flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-sidebar-accent"
          >
            <p className="truncate text-xs text-muted-foreground">
              {nickname || "마이페이지"}
            </p>
          </Link>

          {activeChannel?.lastSyncedAt && (
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              최근 댓글 업데이트 {formatClockTime(activeChannel.lastSyncedAt)}
              <br />
              다음 댓글 업데이트{" "}
              <SyncCountdown target={activeChannel.nextSyncAt} />
            </p>
          )}

          <LogoutButton className="border-sidebar-border bg-transparent text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground" />
        </div>
      </aside>
    </>
  );
}
```

기존엔 채널 썸네일이 하단 닉네임 옆에 있었는데, 이제 상단 채널 전환 버튼 쪽으로 옮겨졌다 —
하단은 순수 계정(닉네임) 정보만 남는다.

- [ ] **Step 3: 타입체크 및 린트**

Run: `npx tsc --noEmit && npm run lint`
Expected: 두 컴포넌트 자체는 에러 없음. 이 컴포넌트들을 렌더링하던 옛 `(app)/layout.tsx`는
Task 8에서 삭제되므로, 그 전까지는 `(app)/layout.tsx`가 옛 props로 이 컴포넌트를 호출하고
있어 타입 에러가 날 수 있음 — Task 8에서 해소.

- [ ] **Step 4: 커밋**

```bash
git add src/components/layout/app-sidebar.tsx src/components/layout/sidebar-nav.tsx
git commit -m "feat: 사이드바를 채널 전환 드롭다운 포함한 멀티채널 UI로 재작성"
```

---

## Task 8: 레이아웃 재구성 + 채널 종속 페이지 전체 이동

**Files:**
- Delete: `src/app/(app)/layout.tsx`
- Create: `src/lib/auth/require-channels.ts`
- Create: `src/app/(app)/c/[channelId]/layout.tsx`
- Create: `src/app/(app)/mypage/layout.tsx`
- Move + Modify: `src/app/(app)/dashboard/page.tsx` → `src/app/(app)/c/[channelId]/dashboard/page.tsx`
- Move + Modify: `src/app/(app)/comments/page.tsx` → `src/app/(app)/c/[channelId]/comments/page.tsx`
- Move + Modify: `src/app/(app)/review/page.tsx` → `src/app/(app)/c/[channelId]/review/page.tsx`
- Move + Modify: `src/app/(app)/summary/page.tsx` → `src/app/(app)/c/[channelId]/summary/page.tsx`
- Move + Modify: `src/app/(app)/evidence-archive/page.tsx` → `src/app/(app)/c/[channelId]/evidence-archive/page.tsx`
- Move + Modify: `src/app/(app)/notifications/page.tsx` → `src/app/(app)/c/[channelId]/notifications/page.tsx`
- Move + Modify: `src/app/(app)/authors/[authorChannelId]/page.tsx` → `src/app/(app)/c/[channelId]/authors/[authorChannelId]/page.tsx`
- Modify: `src/components/authors/author-comment-feed.tsx`
- Modify: `src/app/api/authors/[authorChannelId]/subscription/route.ts`
- Modify: `src/components/comments/status-action-button.tsx`
- Modify: `src/components/dashboard/comments-table.tsx`
- Modify: `src/app/api/comments/[id]/status/route.ts`
- Modify: `src/components/dashboard/notification-bell.tsx`
- Modify: `src/components/notifications/notification-row.tsx`
- Modify: `src/app/api/notifications/[id]/read/route.ts`
- Modify: `src/app/api/notifications/read-all/route.ts`

**Interfaces:**
- Consumes: Task 3(channels.ts), Task 5(comments.ts), Task 6(notifications.ts), Task 7(사이드바)
- Produces: `/c/[channelId]/...` 전체 라우트 트리, `requireChannels()` 헬퍼

이 태스크는 크지만 전부 한 덩어리로 묶여야 한다 — 레이아웃만 만들고 페이지를 안 옮기거나,
페이지만 옮기고 쿼리 호출부를 안 고치면 그 중간 상태는 빌드조차 안 된다.

- [ ] **Step 1: requireChannels 헬퍼 작성**

```ts
// src/lib/auth/require-channels.ts
import "server-only";

import { redirect } from "next/navigation";

import { getChannelsByUserId } from "@/lib/db/queries/channels";
import { createClient } from "@/lib/supabase/server";

export async function requireChannels() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const channels = await getChannelsByUserId(user.id);
  if (channels.length === 0) {
    redirect("/onboarding");
  }

  const nickname = (user.user_metadata?.nickname as string | undefined) || null;

  return { user, channels, nickname };
}
```

- [ ] **Step 2: 옛 (app)/layout.tsx 삭제**

```bash
rm "src/app/(app)/layout.tsx"
```

- [ ] **Step 3: (app)/c/[channelId]/layout.tsx 작성**

```tsx
// src/app/(app)/c/[channelId]/layout.tsx
import { notFound } from "next/navigation";

import { NotificationBell } from "@/components/dashboard/notification-bell";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { requireChannels } from "@/lib/auth/require-channels";
import { getNextSyncAt } from "@/lib/db/queries/channels";
import { countReviewQueue } from "@/lib/db/queries/comments";
import {
  countUnreadNotifications,
  getNotifications,
} from "@/lib/db/queries/notifications";

const RECENT_NOTIFICATIONS_LIMIT = 8;

export default async function ChannelLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ channelId: string }>;
}) {
  const { channelId } = await params;
  const { channels, nickname } = await requireChannels();

  const channel = channels.find((c) => c.id === channelId);
  if (!channel) {
    notFound();
  }

  const [reviewCount, unreadNotificationCount, recentNotifications] =
    await Promise.all([
      countReviewQueue(channelId),
      countUnreadNotifications(channelId),
      getNotifications(channelId, RECENT_NOTIFICATIONS_LIMIT),
    ]);

  const channelsWithSync = channels.map((c) => ({
    ...c,
    nextSyncAt: getNextSyncAt(c),
  }));

  return (
    <div className="flex h-dvh flex-col overflow-hidden md:flex-row">
      <AppSidebar
        channels={channelsWithSync}
        activeChannelId={channelId}
        nickname={nickname}
        reviewCount={reviewCount}
        unreadNotificationCount={unreadNotificationCount}
      />
      <div className="flex flex-1 flex-col overflow-y-auto bg-background">
        <header className="flex shrink-0 items-center justify-end border-b border-border px-6 py-2 sm:px-10">
          <NotificationBell
            notifications={recentNotifications}
            unreadCount={unreadNotificationCount}
          />
        </header>
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: (app)/mypage/layout.tsx 작성**

```tsx
// src/app/(app)/mypage/layout.tsx
import { AppSidebar } from "@/components/layout/app-sidebar";
import { requireChannels } from "@/lib/auth/require-channels";
import { getNextSyncAt } from "@/lib/db/queries/channels";
import { countReviewQueue } from "@/lib/db/queries/comments";
import { countUnreadNotifications } from "@/lib/db/queries/notifications";

export default async function MypageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { channels, nickname } = await requireChannels();
  const defaultChannel = channels[0];

  const [reviewCount, unreadNotificationCount] = await Promise.all([
    countReviewQueue(defaultChannel.id),
    countUnreadNotifications(defaultChannel.id),
  ]);

  const channelsWithSync = channels.map((c) => ({
    ...c,
    nextSyncAt: getNextSyncAt(c),
  }));

  return (
    <div className="flex h-dvh flex-col overflow-hidden md:flex-row">
      <AppSidebar
        channels={channelsWithSync}
        nickname={nickname}
        reviewCount={reviewCount}
        unreadNotificationCount={unreadNotificationCount}
      />
      <div className="flex flex-1 flex-col overflow-y-auto bg-background">
        {children}
      </div>
    </div>
  );
}
```

(`activeChannelId`를 안 넘기므로 `AppSidebar`가 `channels[0]`을 기본값으로 씀 — 마이페이지는
특정 채널 맥락이 없어서 자연스럽게 첫 채널이 강조 표시됨)

- [ ] **Step 5: dashboard 페이지 이동 + 수정**

```bash
mkdir -p "src/app/(app)/c/[channelId]/dashboard"
git mv "src/app/(app)/dashboard/page.tsx" "src/app/(app)/c/[channelId]/dashboard/page.tsx"
```

파일 내용을 아래로 교체:

```tsx
import { notFound } from "next/navigation";

import { DailyTrendCard } from "@/components/dashboard/daily-trend-card";
import { InstagramTrendPlaceholderCard } from "@/components/dashboard/instagram-trend-placeholder-card";
import { RecentCommentsPreview } from "@/components/dashboard/recent-comments-preview";
import { RepeatAuthorNotificationsCard } from "@/components/dashboard/repeat-author-notifications-card";
import { ReviewCallout } from "@/components/dashboard/review-callout";
import { SummaryTiles } from "@/components/dashboard/summary-tiles";
import { TopAuthorsCard } from "@/components/dashboard/top-authors-card";
import { TopVideosCard } from "@/components/dashboard/top-videos-card";
import { getChannelById } from "@/lib/db/queries/channels";
import {
  countMaliciousCommentsInRange,
  getDailyMaliciousCounts,
  getDashboardSummary,
  getFlaggedComments,
  getTopAuthorsByMaliciousCount,
  getTopVideosByMaliciousCount,
} from "@/lib/db/queries/comments";
import { getNotifications } from "@/lib/db/queries/notifications";

const RECENT_COMMENTS_LIMIT = 5;
const TREND_DAYS = 7;
const TOP_LIST_LIMIT = 5;

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ channelId: string }>;
}) {
  const { channelId } = await params;
  const channel = await getChannelById(channelId);
  if (!channel) notFound();

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [
    summary,
    recentComments,
    allNotifications,
    dailyCounts,
    thisWeekCount,
    lastWeekCount,
    topAuthorsAllTime,
    topAuthorsThisWeek,
    topVideos,
  ] = await Promise.all([
    getDashboardSummary(channelId),
    getFlaggedComments(channelId, { sort: "risk" }, 1, RECENT_COMMENTS_LIMIT),
    getNotifications(channelId, 30),
    getDailyMaliciousCounts(channelId, oneWeekAgo, now),
    countMaliciousCommentsInRange(channelId, oneWeekAgo, now),
    countMaliciousCommentsInRange(channelId, twoWeeksAgo, oneWeekAgo),
    getTopAuthorsByMaliciousCount(channelId, TOP_LIST_LIMIT),
    getTopAuthorsByMaliciousCount(channelId, TOP_LIST_LIMIT, oneWeekAgo),
    getTopVideosByMaliciousCount(channelId, oneWeekAgo, TOP_LIST_LIMIT),
  ]);

  const repeatAuthorNotifications = allNotifications
    .filter((n) => n.type === "repeat_author")
    .slice(0, 3);

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8 sm:px-10">
      <header>
        <p className="text-xl font-semibold tracking-tight text-foreground">
          대시보드
        </p>
        <p className="text-xs text-muted-foreground">
          {channel.channelTitle} 채널의 위험 댓글 현황입니다.
        </p>
      </header>

      <SummaryTiles summary={summary} />

      <ReviewCallout count={summary.needsReview} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DailyTrendCard
          dailyCounts={dailyCounts}
          days={TREND_DAYS}
          thisWeekCount={thisWeekCount}
          lastWeekCount={lastWeekCount}
        />
        <InstagramTrendPlaceholderCard />
      </div>

      <RecentCommentsPreview rows={recentComments} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TopAuthorsCard title="요주의 작성자 (누적)" rows={topAuthorsAllTime} />
        <TopAuthorsCard
          title="요주의 작성자 (최근 7일)"
          rows={topAuthorsThisWeek}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TopVideosCard rows={topVideos} />
        <RepeatAuthorNotificationsCard rows={repeatAuthorNotifications} />
      </div>
    </main>
  );
}
```

(로그인 체크는 상위 `c/[channelId]/layout.tsx`가 이미 하므로 페이지에서 반복 안 함 — 대신
`getChannelById`로 해당 채널이 실제로 존재하는지만 한 번 더 확인. 레이아웃에서 이미
`channels.find`로 소유권 확인을 했으니 사실 이중 체크지만, 페이지 단독으로도 안전하게 만들기
위해 유지)

- [ ] **Step 6: comments 페이지 이동 + 수정**

```bash
mkdir -p "src/app/(app)/c/[channelId]/comments"
git mv "src/app/(app)/comments/page.tsx" "src/app/(app)/c/[channelId]/comments/page.tsx"
```

파일 내용을 아래로 교체:

```tsx
import { CommentFilters } from "@/components/dashboard/comment-filters";
import { CommentSearch } from "@/components/dashboard/comment-search";
import { CommentsTable } from "@/components/dashboard/comments-table";
import { Pagination } from "@/components/dashboard/pagination";
import {
  countFlaggedComments,
  getFlaggedComments,
  getFlaggedFilterOptions,
  type CommentFilters as CommentFiltersType,
} from "@/lib/db/queries/comments";

const PAGE_SIZE = 15;

export default async function CommentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ channelId: string }>;
  searchParams: Promise<{
    risk?: string;
    category?: string;
    status?: string;
    video?: string;
    search?: string;
    author?: string;
    dateFrom?: string;
    dateTo?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const { channelId } = await params;
  const sp = await searchParams;
  const filters: CommentFiltersType = {
    riskLevel: sp.risk as CommentFiltersType["riskLevel"],
    category: sp.category,
    status: sp.status as CommentFiltersType["status"],
    videoId: sp.video,
    search: sp.search,
    author: sp.author,
    dateFrom: sp.dateFrom,
    dateTo: sp.dateTo,
    sort: sp.sort as CommentFiltersType["sort"],
  };
  const page = Math.max(1, Number(sp.page) || 1);

  const [rows, filterOptions, totalCount, allCount] = await Promise.all([
    getFlaggedComments(channelId, filters, page, PAGE_SIZE),
    getFlaggedFilterOptions(channelId),
    countFlaggedComments(channelId, filters),
    countFlaggedComments(channelId, {}),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8 sm:px-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xl font-semibold tracking-tight text-foreground">
            댓글 목록
          </p>
          <p className="text-xs text-muted-foreground">
            위험도별로 플래그된 댓글입니다.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <CommentSearch />
          <CommentSearch paramKey="author" placeholder="작성자 검색" />
        </div>
      </header>

      <CommentFilters
        categories={filterOptions.categories}
        videos={filterOptions.videos}
        totalCount={allCount}
        filteredCount={totalCount}
      />

      <CommentsTable rows={rows} channelId={channelId} />

      {totalPages > 1 && (
        <Pagination currentPage={page} totalPages={totalPages} />
      )}
    </main>
  );
}
```

- [ ] **Step 7: review 페이지 이동 + 수정**

```bash
mkdir -p "src/app/(app)/c/[channelId]/review"
git mv "src/app/(app)/review/page.tsx" "src/app/(app)/c/[channelId]/review/page.tsx"
```

`export default async function ReviewPage() {` 위쪽의 supabase 인증 체크(4줄)와 아래 부분을
전부 아래로 교체:

```tsx
import { CheckCircle2 } from "lucide-react";

import { StatusActionButton } from "@/components/comments/status-action-button";
import { RiskBadge } from "@/components/dashboard/risk-badge";
import { getReviewQueue } from "@/lib/db/queries/comments";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ channelId: string }>;
}) {
  const { channelId } = await params;
  const queue = await getReviewQueue(channelId);

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8 sm:px-10">
      <header>
        <p className="text-xl font-semibold tracking-tight text-foreground">
          검토 필요
        </p>
        <p className="text-xs text-muted-foreground">
          AI가 확신하지 못한 댓글입니다. 직접 확인해서 확정해 주세요.
        </p>
      </header>

      {queue.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-card px-6 py-16 text-center">
          <CheckCircle2 className="size-8 text-risk-low" aria-hidden />
          <p className="text-sm text-muted-foreground">
            검토할 댓글이 없습니다.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {queue.map((comment) => (
            <div
              key={comment.id}
              className="flex flex-col gap-3 rounded-2xl bg-card px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  {comment.riskLevel && (
                    <RiskBadge riskLevel={comment.riskLevel} />
                  )}
                  <span className="text-xs text-muted-foreground">
                    {comment.category}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    confidence {comment.confidence}
                  </span>
                </div>
                <p className="text-sm text-card-foreground">{comment.text}</p>
                <p className="text-xs text-muted-foreground">
                  작성자: {comment.authorDisplayName ?? "알 수 없음"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {comment.reason}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <StatusActionButton
                  commentId={comment.id}
                  channelId={channelId}
                  status="confirmed"
                  label="악성 맞음"
                  variant="default"
                />
                <StatusActionButton
                  commentId={comment.id}
                  channelId={channelId}
                  status="whitelisted"
                  label="아님"
                  variant="outline"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 8: summary 페이지 이동 + 수정**

```bash
mkdir -p "src/app/(app)/c/[channelId]/summary"
git mv "src/app/(app)/summary/page.tsx" "src/app/(app)/c/[channelId]/summary/page.tsx"
```

파일 내용을 아래로 교체:

```tsx
import { RiskBadge } from "@/components/dashboard/risk-badge";
import {
  countMaliciousCommentsInRange,
  getRiskBreakdownInRange,
} from "@/lib/db/queries/comments";
import { getNotifications } from "@/lib/db/queries/notifications";
import { formatWeekDiff } from "@/lib/format/week-diff";

const RISK_BAR_CLASSES = {
  high: "bg-risk-high",
  medium: "bg-risk-medium",
  low: "bg-risk-low",
} as const;

function formatDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
}

export default async function SummaryPage({
  params,
}: {
  params: Promise<{ channelId: string }>;
}) {
  const { channelId } = await params;

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [thisWeekCount, lastWeekCount, breakdown, notifications] =
    await Promise.all([
      countMaliciousCommentsInRange(channelId, oneWeekAgo, now),
      countMaliciousCommentsInRange(channelId, twoWeeksAgo, oneWeekAgo),
      getRiskBreakdownInRange(channelId, oneWeekAgo, now),
      getNotifications(channelId),
    ]);

  const history = notifications.filter((n) => n.type === "weekly_digest");

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8 sm:px-10">
      <header>
        <p className="text-xl font-semibold tracking-tight text-foreground">
          주간 요약
        </p>
        <p className="text-xs text-muted-foreground">
          {formatDate(oneWeekAgo)} ~ {formatDate(now)}, 지난주 대비 변화입니다.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-card px-5 py-4">
          <p className="text-xs text-muted-foreground">이번 주 위험 댓글</p>
          <p className="mt-1 text-3xl font-semibold text-card-foreground">
            {thisWeekCount}
          </p>
        </div>
        <div className="rounded-2xl bg-card px-5 py-4">
          <p className="text-xs text-muted-foreground">지난주 대비</p>
          <p className="mt-1 text-3xl font-semibold text-card-foreground">
            {formatWeekDiff(thisWeekCount, lastWeekCount)}
          </p>
        </div>
        <div className="rounded-2xl bg-card px-5 py-4">
          <p className="text-xs text-muted-foreground">지난주 위험 댓글</p>
          <p className="mt-1 text-3xl font-semibold text-card-foreground">
            {lastWeekCount}
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-card px-5 py-4">
        <p className="mb-3 text-sm font-medium text-card-foreground">
          이번 주 위험도 분해
        </p>
        <div className="flex flex-col gap-3">
          {(["high", "medium", "low"] as const).map((level) => (
            <div key={level} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-sm">
                <RiskBadge riskLevel={level} />
                <span className="font-mono text-muted-foreground">
                  {breakdown[level]}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-border">
                <div
                  className={`h-full ${RISK_BAR_CLASSES[level]}`}
                  style={{
                    width: thisWeekCount
                      ? `${(breakdown[level] / thisWeekCount) * 100}%`
                      : "0%",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-3 text-sm font-medium text-foreground">
          지난 주간 요약 알림 기록
        </p>
        {history.length === 0 ? (
          <p className="rounded-2xl bg-card px-5 py-8 text-center text-sm text-muted-foreground">
            아직 생성된 주간 요약 알림이 없습니다. 위 수치는 지금 이 순간
            기준으로 실시간 계산된 값입니다 — 요일마다 매번 새로 생성되는
            알림과는 별개로 언제든 확인할 수 있습니다.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {history.map((notification) => (
              <div
                key={notification.id}
                className="rounded-2xl bg-card px-5 py-4"
              >
                <p className="text-sm text-card-foreground">
                  {notification.message}
                </p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {formatDate(notification.createdAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 9: evidence-archive 페이지 이동 (내용은 거의 그대로, 인증 체크만 제거)**

```bash
mkdir -p "src/app/(app)/c/[channelId]/evidence-archive"
git mv "src/app/(app)/evidence-archive/page.tsx" "src/app/(app)/c/[channelId]/evidence-archive/page.tsx"
```

파일 내용을 아래로 교체:

```tsx
import { Archive } from "lucide-react";

export default function EvidenceArchivePage() {
  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8 sm:px-10">
      <header>
        <p className="text-xl font-semibold tracking-tight text-foreground">
          증거 보관함
        </p>
        <p className="text-xs text-muted-foreground">
          확정된 악성 댓글의 증거를 모아두는 공간입니다.
        </p>
      </header>

      <div className="flex flex-col items-center gap-2 rounded-2xl bg-card px-6 py-16 text-center">
        <Archive className="size-8 text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">추가 예정입니다.</p>
      </div>
    </main>
  );
}
```

- [ ] **Step 10: notifications 페이지 이동 + 수정**

```bash
mkdir -p "src/app/(app)/c/[channelId]/notifications"
git mv "src/app/(app)/notifications/page.tsx" "src/app/(app)/c/[channelId]/notifications/page.tsx"
```

파일 내용을 아래로 교체:

```tsx
import { BellIcon } from "@/components/icons/bell-icon";
import { MarkAllReadButton } from "@/components/notifications/mark-all-read-button";
import { NotificationRow } from "@/components/notifications/notification-row";
import { getNotifications } from "@/lib/db/queries/notifications";

export default async function NotificationsPage({
  params,
}: {
  params: Promise<{ channelId: string }>;
}) {
  const { channelId } = await params;
  const notifications = await getNotifications(channelId);
  const hasUnread = notifications.some((n) => !n.isRead);

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8 sm:px-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xl font-semibold tracking-tight text-foreground">
            알림
          </p>
          <p className="text-xs text-muted-foreground">
            알림 받기로 설정한 작성자가 새로 남긴 악성 댓글입니다.
          </p>
        </div>
        {hasUnread && <MarkAllReadButton channelId={channelId} />}
      </header>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-card px-6 py-16 text-center">
          <BellIcon className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            아직 알림이 없습니다. 작성자 상세 페이지에서 &quot;새 댓글 알림
            받기&quot;를 눌러보세요.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {notifications.map((notification) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
            />
          ))}
        </div>
      )}
    </main>
  );
}
```

`MarkAllReadButton`에 `channelId` prop이 필요해졌다 — 그 컴포넌트가 호출하는
`/api/notifications/read-all` 라우트도 channelId를 받아야 하므로, 아래 Step 15에서
같이 고친다. `MarkAllReadButton` 컴포넌트 자체(`src/components/notifications/mark-all-read-button.tsx`)를
열어서 `channelId: string` prop을 받아 fetch body에 `{ channelId }`를 담아 보내도록 수정한다
(기존에 body 없이 호출하던 걸 body 추가).

- [ ] **Step 11: authors/[authorChannelId] 페이지 이동 + 수정**

```bash
mkdir -p "src/app/(app)/c/[channelId]/authors/[authorChannelId]"
git mv "src/app/(app)/authors/[authorChannelId]/page.tsx" "src/app/(app)/c/[channelId]/authors/[authorChannelId]/page.tsx"
rmdir "src/app/(app)/authors/[authorChannelId]" "src/app/(app)/authors" 2>/dev/null || true
```

파일 내용을 아래로 교체:

```tsx
import Link from "next/link";
import { ArrowLeft, Inbox } from "lucide-react";

import { AuthorCommentFeed } from "@/components/authors/author-comment-feed";
import { RiskBadge } from "@/components/dashboard/risk-badge";
import {
  getCommentsByAuthor,
  type CommentRiskLevel,
} from "@/lib/db/queries/comments";
import { isSubscribedToAuthor } from "@/lib/db/queries/notifications";

function formatDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
}

const RISK_BAR_CLASSES: Record<CommentRiskLevel, string> = {
  high: "bg-risk-high",
  medium: "bg-risk-medium",
  low: "bg-risk-low",
};

export default async function AuthorPage({
  params,
}: {
  params: Promise<{ channelId: string; authorChannelId: string }>;
}) {
  const { channelId, authorChannelId } = await params;
  const decodedAuthorChannelId = decodeURIComponent(authorChannelId);
  const [comments, isSubscribed] = await Promise.all([
    getCommentsByAuthor(channelId, decodedAuthorChannelId),
    isSubscribedToAuthor(channelId, decodedAuthorChannelId),
  ]);
  const displayName = comments[0]?.authorDisplayName ?? "알 수 없음";
  const initial = displayName.replace(/^@/, "").charAt(0).toUpperCase() || "?";

  const riskCounts: Record<CommentRiskLevel, number> = {
    high: 0,
    medium: 0,
    low: 0,
  };
  const categoryCounts = new Map<string, number>();
  for (const comment of comments) {
    if (comment.riskLevel) riskCounts[comment.riskLevel] += 1;
    if (comment.category) {
      categoryCounts.set(
        comment.category,
        (categoryCounts.get(comment.category) ?? 0) + 1,
      );
    }
  }
  const topCategories = Array.from(categoryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([category]) => category);
  const firstSeen = comments[comments.length - 1]?.createdAt;

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8 sm:px-10">
      <Link
        href={`/c/${channelId}/dashboard`}
        className="flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        대시보드로 돌아가기
      </Link>

      {comments.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-card px-6 py-16 text-center">
          <Inbox className="size-8 text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">
            해당 작성자의 댓글을 찾을 수 없습니다.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
          <aside className="flex flex-col gap-6 border-b border-border pb-7 lg:sticky lg:top-8 lg:border-b-0 lg:border-r lg:pr-8 lg:pb-0">
            <div className="flex items-center gap-4">
              <div className="flex size-16 shrink-0 items-center justify-center rounded-full border border-border bg-gradient-to-br from-secondary to-background text-2xl font-semibold text-primary">
                {initial}
              </div>
              <div className="min-w-0">
                <p
                  className="truncate text-xl font-semibold text-foreground"
                  title={displayName}
                >
                  {displayName}
                </p>
                {firstSeen && (
                  <p className="font-mono text-xs text-muted-foreground">
                    추적 시작 {formatDate(firstSeen)}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {(["high", "medium", "low"] as const).map((level) => (
                <div key={level} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <RiskBadge riskLevel={level} />
                    <span className="font-mono text-muted-foreground">
                      {riskCounts[level]}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-border">
                    <div
                      className={`h-full ${RISK_BAR_CLASSES[level]}`}
                      style={{
                        width: comments.length
                          ? `${(riskCounts[level] / comments.length) * 100}%`
                          : "0%",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {topCategories.length > 0 && (
              <div className="flex flex-col gap-2.5 border-t border-border pt-5">
                <p className="font-mono text-xs text-muted-foreground">
                  주요 유형
                </p>
                <div className="flex flex-wrap gap-2">
                  {topCategories.map((category) => (
                    <span
                      key={category}
                      className="rounded-full border border-border px-2.5 py-1 text-sm text-muted-foreground"
                    >
                      {category}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </aside>

          <div className="pt-7 lg:pt-0">
            <AuthorCommentFeed
              comments={comments}
              displayName={displayName}
              initial={initial}
              channelId={channelId}
              authorChannelId={decodedAuthorChannelId}
              initialSubscribed={isSubscribed}
            />
          </div>
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 12: author-comment-feed.tsx에 channelId prop 추가**

`src/components/authors/author-comment-feed.tsx`에서 props 타입에 `channelId: string`을
추가하고, `handleToggleSubscribe`의 fetch body에 `channelId`를 포함시킨다:

```tsx
export function AuthorCommentFeed({
  comments,
  displayName,
  initial,
  authorChannelId,
  initialSubscribed,
}: {
  comments: AuthorComment[];
  displayName: string;
  initial: string;
  authorChannelId: string;
  initialSubscribed: boolean;
}) {
```

를

```tsx
export function AuthorCommentFeed({
  comments,
  displayName,
  initial,
  channelId,
  authorChannelId,
  initialSubscribed,
}: {
  comments: AuthorComment[];
  displayName: string;
  initial: string;
  channelId: string;
  authorChannelId: string;
  initialSubscribed: boolean;
}) {
```

로, 그리고:

```tsx
    const res = await fetch(
      `/api/authors/${encodeURIComponent(authorChannelId)}/subscription`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscribed: nextSubscribed,
          authorDisplayName: displayName,
        }),
      },
    );
```

를

```tsx
    const res = await fetch(
      `/api/authors/${encodeURIComponent(authorChannelId)}/subscription`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId,
          subscribed: nextSubscribed,
          authorDisplayName: displayName,
        }),
      },
    );
```

로 바꾼다.

- [ ] **Step 13: subscription API 라우트 수정**

`src/app/api/authors/[authorChannelId]/subscription/route.ts` 전체를 아래로 교체:

```ts
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  subscribeToAuthor,
  unsubscribeFromAuthor,
} from "@/lib/db/queries/notifications";
import { createClient } from "@/lib/supabase/server";

const BodySchema = z.object({
  channelId: z.string(),
  subscribed: z.boolean(),
  authorDisplayName: z.string().nullable().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ authorChannelId: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = BodySchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { authorChannelId } = await params;
  const decodedAuthorChannelId = decodeURIComponent(authorChannelId);

  if (body.data.subscribed) {
    await subscribeToAuthor(
      user.id,
      body.data.channelId,
      decodedAuthorChannelId,
      body.data.authorDisplayName ?? null,
    );
  } else {
    await unsubscribeFromAuthor(body.data.channelId, decodedAuthorChannelId);
  }

  return NextResponse.json({ ok: true });
}
```

(채널 소유권 검증은 안 하는데, 기존 코드도 안 했었다 — `authorChannelId`처럼 채널 id도
추측하기 어려운 UUID라 이번 태스크에서 새로 강화하지 않고 기존 보안 수준을 유지한다)

- [ ] **Step 14: comments-table.tsx + status-action-button.tsx에 channelId 스레딩**

`src/components/comments/status-action-button.tsx`의 props와 fetch body에 `channelId` 추가:

```tsx
type Props = {
  commentId: string;
  channelId: string;
  status: Status;
  label: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
};

export function StatusActionButton({
  commentId,
  channelId,
  status,
  label,
  variant = "outline",
}: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleClick() {
    setIsLoading(true);
    const res = await fetch(`/api/comments/${commentId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId, status }),
    });
```

(이하 동일, `disabled={isLoading}`까지 나머지 렌더 부분은 그대로 둔다)

`src/components/dashboard/comments-table.tsx`에서 `<StatusActionButton commentId={row.id}`가
쓰이는 부분에 `channelId` prop을 추가해야 한다 — 이 컴포넌트가 `channelId`를 prop으로
받도록 컴포넌트 시그니처에도 `channelId: string`을 추가하고, 호출부(Task 8 Step 6에서 옮긴
`comments/page.tsx`)에서 `<CommentsTable rows={rows} channelId={channelId} />`로 이미 넘기고
있으니 그 값을 그대로 `<StatusActionButton commentId={row.id} channelId={channelId} .../>`에
전달한다.

- [ ] **Step 15: comments status API 라우트 수정**

`src/app/api/comments/[id]/status/route.ts`에서:

```ts
const BodySchema = z.object({
  status: z.enum(["confirmed", "reported_false", "whitelisted"]),
});
```

를

```ts
const BodySchema = z.object({
  channelId: z.string(),
  status: z.enum(["confirmed", "reported_false", "whitelisted"]),
});
```

로, 그리고:

```ts
  const { id } = await params;
  const updated = await updateCommentStatus(id, user.id, body.data.status);
```

를

```ts
  const { id } = await params;
  const updated = await updateCommentStatus(id, body.data.channelId, body.data.status);
```

로 바꾼다. (`createClient`/`user` 체크는 로그인 여부만 확인하는 용도로 그대로 둔다 — 실제
소유권 검증은 `updateCommentStatus`가 `channelId`로 WHERE 절을 걸어서 함)

- [ ] **Step 16: notification-bell.tsx / notification-row.tsx 기본 href 수정 + 읽음처리 API**

`src/components/dashboard/notification-bell.tsx`와
`src/components/notifications/notification-row.tsx`에서 `href ?? "/dashboard"` 폴백은
channelId 없이는 어차피 유효한 경로를 못 만드므로, 두 컴포넌트 다 `channelId: string` prop을
새로 받아서 폴백을 `` href ?? `/c/${channelId}/dashboard` ``로 바꾸고, `href ?? "/notifications"`도
`` href ?? `/c/${channelId}/notifications` ``로 바꾼다. 이 두 컴포넌트를 렌더링하는 곳(Step
3의 `c/[channelId]/layout.tsx`, Step 10의 notifications 페이지)에서 `channelId` prop을
같이 넘기도록 호출부도 수정한다.

읽음 처리 API 두 개도 channelId 기준으로 바꾼다:

`src/app/api/notifications/[id]/read/route.ts`에서 `markNotificationRead(id, user.id)`
호출을, 요청 body(또는 쿼리 파라미터)로 받은 `channelId`를 써서
`markNotificationRead(id, channelId)`로 바꾼다 — `notification-bell.tsx`/`notification-row.tsx`의
클릭 핸들러가 이 엔드포인트를 호출할 때 `channelId`를 body에 실어 보내도록 같이 고친다.

`src/app/api/notifications/read-all/route.ts`도 동일하게 `markAllNotificationsRead(user.id)`를
`markAllNotificationsRead(channelId)`로, body에서 `channelId`를 받도록 고친다 (Step 10에서
이미 `MarkAllReadButton`에 `channelId` prop을 추가하기로 했다).

- [ ] **Step 17: 타입체크 및 린트**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음. 여기서 실제로 대부분의 타입 에러가 한꺼번에 해소되어야 한다 — 남은 게
있으면 위 스텝 중 빠뜨린 호출부가 있다는 뜻이니 찾아서 고친다.

- [ ] **Step 18: 브라우저로 실제 확인**

`npm run dev` 후 로그인 상태로:
1. `/c/{실제 channelId}/dashboard` 접속 → 정상 렌더링, 사이드바에 채널 전환 드롭다운 보이는지
2. 댓글 목록·검토·주간요약·알림 페이지 전부 이동해서 정상 동작하는지
3. 검토 필요 페이지에서 "악성 맞음"/"아님" 버튼이 여전히 동작하는지
4. 알림벨/알림 목록에서 "모두 읽음" 처리가 여전히 동작하는지
5. 작성자 상세 페이지(`/c/{channelId}/authors/{authorChannelId}`)에서 "새 댓글 알림 받기"
   토글이 여전히 동작하는지
6. `/mypage/subscription` 등 마이페이지 하위 페이지도 사이드바가 정상적으로 뜨는지(첫 번째
   채널 기준으로)

- [ ] **Step 19: 커밋**

```bash
git add -A
git commit -m "feat: 채널 종속 페이지를 /c/[channelId] 하위로 이동, 레이아웃 재구성"
```

---

## Task 9: mypage/account 재작성 + onboarding 단순화 + 로그인 리다이렉트 수정

**Files:**
- Modify: `src/app/(app)/mypage/account/page.tsx`
- Modify: `src/app/onboarding/page.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `getChannelsByUserId`, `deleteChannelById` (Task 3)

- [ ] **Step 1: mypage/account/page.tsx를 채널 목록형으로 재작성**

전체 파일을 아래로 교체:

```tsx
import { redirect } from "next/navigation";

import { MypageNav } from "@/components/mypage/mypage-nav";
import { Button } from "@/components/ui/button";
import { DangerZoneButton } from "@/components/settings/danger-zone-button";
import {
  deleteChannelById,
  deleteChannelByUserId,
  getChannelsByUserId,
} from "@/lib/db/queries/channels";
import { deleteCommentsByUserId } from "@/lib/db/queries/comments";
import { deleteNotificationsByUserId } from "@/lib/db/queries/notifications";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const ERROR_MESSAGES: Record<string, string> = {
  channel_limit: "현재 플랜의 채널 연동 한도에 도달했습니다. 플랜을 업그레이드해 주세요.",
};

export default async function MypageAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const errorMessage = error ? ERROR_MESSAGES[error] : undefined;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const userId = user.id;
  const channels = await getChannelsByUserId(userId);

  async function disconnectChannel(formData: FormData) {
    "use server";
    const channelId = String(formData.get("channelId"));
    await deleteChannelById(channelId);
    redirect("/mypage/account");
  }

  async function deleteAccount() {
    "use server";
    await deleteNotificationsByUserId(userId);
    await deleteCommentsByUserId(userId);
    await deleteChannelByUserId(userId);

    const admin = createAdminClient();
    await admin.auth.admin.deleteUser(userId);

    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/");
  }

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8 sm:px-10">
      <header>
        <p className="text-xl font-semibold tracking-tight text-foreground">
          마이페이지
        </p>
        <p className="text-xs text-muted-foreground">
          계정과 연동된 채널 정보를 관리합니다.
        </p>
      </header>

      <MypageNav />

      {errorMessage && (
        <p className="rounded-md bg-risk-high-bg px-3 py-2 text-xs text-risk-high">
          {errorMessage}
        </p>
      )}

      <section className="space-y-3 rounded-2xl bg-card px-5 py-4">
        <h2 className="text-sm font-medium text-card-foreground">
          연동된 채널 ({channels.length}개)
        </h2>
        {channels.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            연동된 채널이 없습니다.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {channels.map((channel) => (
              <li
                key={channel.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
              >
                <span className="text-sm text-muted-foreground">
                  {channel.channelTitle}
                  {channel.status === "locked" && (
                    <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                      잠김
                    </span>
                  )}
                </span>
                <form action={disconnectChannel}>
                  <input type="hidden" name="channelId" value={channel.id} />
                  <Button type="submit" variant="outline" size="sm">
                    연동 해제
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <Button
          nativeButton={false}
          variant="outline"
          render={<a href="/channel-connect/start">채널 추가</a>}
        />
      </section>

      <section className="space-y-3 rounded-2xl bg-risk-high-bg px-5 py-4">
        <h2 className="text-sm font-medium text-risk-high">위험 구역</h2>
        <p className="text-xs text-muted-foreground">
          계정을 삭제하면 연동 정보와 분석된 댓글이 모두 영구히 삭제되고,
          되돌릴 수 없습니다.
        </p>
        <form action={deleteAccount}>
          <DangerZoneButton confirmMessage="정말로 계정을 삭제하시겠습니까? 모든 데이터가 영구히 삭제되며 되돌릴 수 없습니다.">
            계정 삭제
          </DangerZoneButton>
        </form>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: onboarding/page.tsx 단순화 — "채널 없음" 화면만 남긴다**

채널 연동 성공 시 `channel-connect/callback`이 이제 곧장 `/c/${channelId}/dashboard`로
보내므로, onboarding의 "이 채널이 맞나요?" 확인 화면은 더 이상 정상 흐름에서 도달할 수
없다. 전체 파일을 아래로 교체:

```tsx
import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/auth/logout-button";
import { getChannelsByUserId } from "@/lib/db/queries/channels";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const channels = await getChannelsByUserId(user.id);
  if (channels.length > 0) {
    redirect(`/c/${channels[0].id}/dashboard`);
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        연동된 채널이 없습니다.
      </h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        유튜브 채널을 연동하면 바로 시작할 수 있어요.
      </p>
      <a
        href="/channel-connect/start"
        className="inline-flex h-11 w-full max-w-xs items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        유튜브 채널 연동하기
      </a>
      <LogoutButton />
    </main>
  );
}
```

(순수 `<a>` 태그를 쓴다 — `/channel-connect/start`는 페이지가 아니라 즉시 리다이렉트하는
라우트 핸들러라 `next/link`의 클라이언트 사이드 네비게이션보다 일반 브라우저 이동이 더
간단하고 확실하다. 기존 코드도 다른 곳에서 이미 이 패턴을 쓰고 있다)

- [ ] **Step 3: page.tsx(랜딩)의 로그인 후 리다이렉트 수정**

`src/app/page.tsx`에서:

```tsx
  if (user) {
    const channel = await getChannelByUserId(user.id);
    redirect(channel ? "/dashboard" : "/onboarding");
  }
```

를

```tsx
  if (user) {
    const channels = await getChannelsByUserId(user.id);
    redirect(channels.length > 0 ? `/c/${channels[0].id}/dashboard` : "/onboarding");
  }
```

로 바꾸고, 파일 상단 import를:

```ts
import { getChannelByUserId } from "@/lib/db/queries/channels";
```

에서

```ts
import { getChannelsByUserId } from "@/lib/db/queries/channels";
```

로 바꾼다.

- [ ] **Step 4: 타입체크 및 린트**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음. 이 시점에 프로젝트 전체가 깨끗하게 컴파일돼야 한다.

- [ ] **Step 5: 브라우저로 전체 흐름 재확인**

`npm run dev` 후:
1. 로그아웃 상태에서 `/` → 로그인 → 채널 있으면 바로 `/c/{channelId}/dashboard`로 가는지
2. `/mypage/account`에서 연동된 채널이 목록으로 보이고, "채널 추가" 버튼이 동작하는지
3. (이미 플랜 한도까지 채널을 연동했다면) 채널 추가 시도 시 한도 초과 에러 메시지가
   `/mypage/account`에 뜨는지 — 실제로 한도까지 채우기 번거로우면 이 항목은 코드 리딩으로
   갈음해도 됨
4. 채널 하나를 "연동 해제"했을 때 목록에서 정상적으로 사라지는지

- [ ] **Step 6: 커밋**

```bash
git add src/app/(app)/mypage/account/page.tsx src/app/onboarding/page.tsx src/app/page.tsx
git commit -m "feat: 마이페이지 채널 목록 UI, 온보딩 단순화, 로그인 리다이렉트 수정"
```

---

## Self-Review 메모

- **스펙 커버리지**: 스펙의 "스키마"(Task 1-2) · "라우트 재구성"(Task 8) 전부 태스크로 매핑됨.
  "다운그레이드 잠금 자동화"는 계획 상단에 명시적으로 범위 밖으로 뺐다 — `channels.status`
  컬럼과 사이드바의 잠김 표시(Task 7)까지만 준비되고, 실제 자동 잠금 cron은 다음 계획.
- **타입 일관성**: `channelId: string`이 Task 3(channels.ts)에서 확립된 이후 Task 4~9 전체가
  동일한 이름/타입으로 이어받는다. `upsertChannel`/`connectChannel`의 반환값(`Promise<string>`)
  변경이 Task 4에서 한 번만 이뤄지고 Task 8의 어떤 호출부도 이걸 재정의하지 않는다.
- **놓치기 쉬운 지점**: `notifications.channelId`가 다른 두 컬럼과 달리 최종적으로 nullable로
  남는다(Task 6 Step 2) — 결제 알림만 예외. 이 비대칭을 태스크 안에 명시적으로 적어뒀다.
- **범위**: 하나의 서브시스템(멀티채널)이고 스키마→쿼리→UI 순서의 의존 사슬이라 여러 계획으로
  쪼갤 이유가 없다. 다만 태스크 개수(9개)와 각 태스크의 크기가 지금까지 이 프로젝트에서 실행한
  계획 중 가장 크다 — Task 8은 특히 커서, 실행 중 필요하면 서브태스크로 더 쪼개는 것도
  고려할 만하다(다만 위에 적은 대로 "레이아웃만 만들고 페이지 이동 안 함" 같은 중간 상태는
  빌드가 깨지므로 쪼개더라도 최종 커밋 단위는 유지해야 한다).
