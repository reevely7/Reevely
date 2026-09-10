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
