// 테스트용 관리자 계정 생성/갱신. 이미 있는 username이면 비밀번호만 갱신한다
// (재실행해도 안전). 실행: npx tsx --env-file=.env.local scripts/seed-admin.ts
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import { db } from "../src/lib/db";
import { adminUsers } from "../src/lib/db/schema";
import { hashPassword } from "../src/lib/crypto/password";

const USERNAME = "admin";
const PASSWORD = "1230";

async function main() {
  const passwordHash = hashPassword(PASSWORD);

  await db
    .insert(adminUsers)
    .values({ username: USERNAME, passwordHash })
    .onConflictDoUpdate({
      target: adminUsers.username,
      set: { passwordHash },
    });

  console.log(`관리자 계정 준비 완료: username=${USERNAME}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
