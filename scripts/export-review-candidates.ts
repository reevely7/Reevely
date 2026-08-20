import { config } from "dotenv";

config({ path: ".env.local" });

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { comments } from "../src/lib/db/schema";
import { GOLDEN_CASES } from "./golden-cases";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL 환경변수가 설정되지 않았습니다.");
}

const client = postgres(process.env.DATABASE_URL, { prepare: false });
const db = drizzle(client);

// 오탐 신고(reported_false)된 댓글을 골든 케이스 후보로 뽑아 출력한다.
// "오탐 신고"는 곧 "이건 악성이 아니었다"는 뜻이므로 기본값은 해당없음/false로
// 채우되, 실제로는 악성인데 카테고리만 잘못됐던 경우는 사람이 직접 고쳐야 한다.
async function main() {
  const reported = await db
    .select({
      text: comments.text,
      category: comments.category,
      confidence: comments.confidence,
      promptVersion: comments.promptVersion,
    })
    .from(comments)
    .where(eq(comments.status, "reported_false"));

  const alreadyTracked = new Set(GOLDEN_CASES.map((c) => c.text));
  const candidates = reported.filter((row) => !alreadyTracked.has(row.text));

  if (candidates.length === 0) {
    console.log(
      "새로운 골든 케이스 후보가 없습니다. (오탐 신고가 없거나 이미 전부 등록됨)",
    );
    process.exit(0);
  }

  console.log(
    `골든 케이스 후보 ${candidates.length}건. 검토 후 scripts/golden-cases.ts의 ` +
      "GOLDEN_CASES 배열에 필요한 것만 옮겨 붙이세요.\n" +
      "기본 expected는 is_malicious=false / category=해당없음입니다(오탐 신고 " +
      '= "악성이 아니다"). 실제로는 악성인데 카테고리만 잘못됐던 경우라면 ' +
      "expected를 직접 고쳐서 넣으세요.\n",
  );

  for (const row of candidates) {
    console.log(`  {
    text: ${JSON.stringify(row.text)},
    expected: { is_malicious: false, category: "해당없음" },
    note: ${JSON.stringify(
      `오탐 신고 확인 필요 — 원래 AI 판정: ${row.category ?? "?"} ` +
        `(confidence ${row.confidence ?? "?"}, ${row.promptVersion ?? "버전 미상"})`,
    )},
  },`);
  }

  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
