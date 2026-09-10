// subscriptions 쿼리 함수들이 실제 DB에 잘 왕복하는지 확인한다. 끝나면 만든 row를 정리한다.
// 실행: npm run test:subscriptions
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

import { randomUUID } from "node:crypto";

import { db } from "../src/lib/db";
import { subscriptions } from "../src/lib/db/schema";
import {
  cancelSubscription,
  createSubscription,
  getSubscriptionByUserId,
  setPendingPlan,
} from "../src/lib/db/queries/subscriptions";
import { eq } from "drizzle-orm";

async function main() {
  const fakeUserId = randomUUID();

  await createSubscription({
    userId: fakeUserId,
    plan: "basic",
    billingKey: "test-billing-key",
    tossCustomerKey: fakeUserId,
  });
  console.log("생성 완료");

  const created = await getSubscriptionByUserId(fakeUserId);
  console.log("조회 결과:", created?.plan, created?.billingKey);
  if (created?.billingKey !== "test-billing-key") {
    throw new Error("암호화/복호화 왕복이 원본과 다름");
  }

  const pendingOk = await setPendingPlan(fakeUserId, "pro");
  console.log("플랜 변경 예약:", pendingOk);

  const cancelOk = await cancelSubscription(fakeUserId);
  console.log("해지:", cancelOk);

  await db.delete(subscriptions).where(eq(subscriptions.userId, fakeUserId));
  console.log("정리 완료");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
