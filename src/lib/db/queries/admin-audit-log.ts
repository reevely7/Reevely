import "server-only";

import { desc } from "drizzle-orm";

import { db } from "@/lib/db";
import { adminAuditLog } from "@/lib/db/schema";

type RecordAdminActionInput = {
  targetUserId?: string;
  targetChannelId?: string;
  details?: unknown;
};

export async function recordAdminAction(
  adminId: string,
  adminUsername: string,
  action: string,
  input: RecordAdminActionInput = {},
) {
  await db.insert(adminAuditLog).values({
    adminId,
    adminUsername,
    action,
    targetUserId: input.targetUserId,
    targetChannelId: input.targetChannelId,
    details: input.details,
  });
}

export async function getAdminAuditLog(limit = 100) {
  return db.select().from(adminAuditLog).orderBy(desc(adminAuditLog.createdAt)).limit(limit);
}
