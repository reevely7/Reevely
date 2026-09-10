// nextBillingDate가 지난 가짜 구독을 만들어 getDueSubscriptions가 잡아내는지 확인하고 정리한다.
// 실행: npm run test:billing-cron
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";

import { db } from "../src/lib/db";
import { subscriptions } from "../src/lib/db/schema";
import { getDueSubscriptions } from "../src/lib/db/queries/subscriptions";
import { encrypt } from "../src/lib/crypto/token-cipher";

async function main() {
  const fakeUserId = randomUUID();
  const past = new Date(Date.now() - 24 * 60 * 60 * 1000);

  await db.insert(subscriptions).values({
    userId: fakeUserId,
    plan: "basic",
    status: "active",
    billingKey: encrypt("test-billing-key"),
    tossCustomerKey: fakeUserId,
    currentPeriodStart: past,
    nextBillingDate: past,
  });

  const due = await getDueSubscriptions(new Date());
  const found = due.find((row) => row.userId === fakeUserId);
  console.log("도래한 구독에 포함됨:", Boolean(found));
  if (!found) throw new Error("getDueSubscriptions가 만료된 구독을 못 찾음");

  await db.delete(subscriptions).where(eq(subscriptions.userId, fakeUserId));
  console.log("정리 완료");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
