import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL 환경변수가 설정되지 않았습니다.");
}

// Supabase pooler(transaction mode)는 prepared statement를 지원하지 않으므로 prepare: false 필수
// idle_timeout/max_lifetime: 풀러 쪽에서 먼저 끊어버린 유휴 커넥션을 재사용하다
// ECONNRESET 나는 것을 막기 위해, 클라이언트가 먼저 정리하고 새로 열게 함
const client = postgres(connectionString, {
  prepare: false,
  idle_timeout: 20,
  max_lifetime: 60 * 30,
});

export const db = drizzle(client, { schema });
