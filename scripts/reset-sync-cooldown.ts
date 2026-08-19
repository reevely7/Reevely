import { config } from "dotenv";

config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { channels } from "../src/lib/db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL 환경변수가 설정되지 않았습니다.");
}

const client = postgres(process.env.DATABASE_URL, { prepare: false });
const db = drizzle(client);

async function main() {
  const updated = await db
    .update(channels)
    .set({ lastSyncedAt: null })
    .returning({ id: channels.id });

  console.log(`sync 쿨다운 리셋 완료 (${updated.length}개 채널)`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
