// 주간 요약(weekly_digest) 알림 생성 로직을 실제 cron 없이 바로 테스트한다.
// YouTube sync·OpenAI 분석은 건드리지 않고, 이미 DB에 있는 댓글 데이터만으로
// maybeCreateWeeklyDigest를 호출한다. 실행: npm run test:weekly-digest
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

import { getAllChannels } from "../src/lib/db/queries/channels";
import { maybeCreateWeeklyDigest } from "../src/lib/db/queries/notifications";

async function main() {
  const channels = await getAllChannels();

  if (channels.length === 0) {
    console.log("연동된 채널이 없습니다.");
    process.exit(0);
  }

  for (const channel of channels) {
    await maybeCreateWeeklyDigest(channel.userId);
    console.log(`체크 완료: ${channel.channelTitle} (${channel.userId})`);
  }

  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
