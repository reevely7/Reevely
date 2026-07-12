import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL 환경변수가 설정되지 않았습니다.");
}

// Supabase pooler(transaction mode)는 prepared statement를 지원하지 않으므로 prepare: false 필수
const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });
