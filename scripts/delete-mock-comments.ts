import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

import { drizzle } from "drizzle-orm/postgres-js";
import { like } from "drizzle-orm";
import postgres from "postgres";

import { comments } from "../src/lib/db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL 환경변수가 설정되지 않았습니다.");
}

const client = postgres(process.env.DATABASE_URL, { prepare: false });
const db = drizzle(client);

async function main() {
  const deleted = await db
    .delete(comments)
    .where(like(comments.youtubeCommentId, "mock-seed-%"))
    .returning({ id: comments.id });

  console.log(`목업 댓글 ${deleted.length}개 삭제 완료`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
