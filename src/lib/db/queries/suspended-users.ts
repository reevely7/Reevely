import "server-only";

import { eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import { suspendedUsers } from "@/lib/db/schema";

export async function isUserSuspended(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ userId: suspendedUsers.userId })
    .from(suspendedUsers)
    .where(eq(suspendedUsers.userId, userId))
    .limit(1);

  return Boolean(row);
}

// cron 등에서 여러 유저의 정지 여부를 한 번에 확인할 때 — 채널 개수만큼
// 개별 조회하지 않도록 Set으로 반환한다.
export async function getSuspendedUserIds(): Promise<Set<string>> {
  const rows = await db.select({ userId: suspendedUsers.userId }).from(suspendedUsers);
  return new Set(rows.map((row) => row.userId));
}

export async function getSuspendedUserIdsIn(userIds: string[]): Promise<Set<string>> {
  if (userIds.length === 0) return new Set();
  const rows = await db
    .select({ userId: suspendedUsers.userId })
    .from(suspendedUsers)
    .where(inArray(suspendedUsers.userId, userIds));
  return new Set(rows.map((row) => row.userId));
}

export async function suspendUser(userId: string, reason?: string) {
  await db
    .insert(suspendedUsers)
    .values({ userId, reason })
    .onConflictDoUpdate({
      target: suspendedUsers.userId,
      set: { reason, suspendedAt: new Date() },
    });
}

export async function unsuspendUser(userId: string) {
  await db.delete(suspendedUsers).where(eq(suspendedUsers.userId, userId));
}
