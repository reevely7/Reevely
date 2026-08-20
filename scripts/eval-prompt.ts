// 환경변수는 이 스크립트 자체가 아니라 npm run eval:prompt(package.json)의
// --env-file=.env.local 플래그로 로드한다. import가 require로 변환되며
// 파일 상단으로 끌어올려지는 특성상, 이 파일 안에서 dotenv를 호출하면
// analyze-comment.ts가 먼저 로드돼 OPENAI_API_KEY를 못 읽는 문제가 있었다.
import { analyzeComment, PROMPT_VERSION } from "../src/lib/ai/analyze-comment";
import { GOLDEN_CASES } from "./golden-cases";

type Failure = {
  text: string;
  expected: string;
  actual: string;
  note: string;
};

async function main() {
  console.log(
    `prompt_version=${PROMPT_VERSION} · 골든 케이스 ${GOLDEN_CASES.length}개 평가 시작\n`,
  );

  let passed = 0;
  const failures: Failure[] = [];

  for (const testCase of GOLDEN_CASES) {
    const result = await analyzeComment(testCase.text);
    const isMatch =
      result.is_malicious === testCase.expected.is_malicious &&
      result.category === testCase.expected.category;

    if (isMatch) {
      passed++;
      console.log(`PASS  ${testCase.text}`);
    } else {
      console.log(`FAIL  ${testCase.text}`);
      failures.push({
        text: testCase.text,
        expected: `is_malicious=${testCase.expected.is_malicious}, category=${testCase.expected.category}`,
        actual: `is_malicious=${result.is_malicious}, category=${result.category}`,
        note: testCase.note,
      });
    }
  }

  const rate = ((passed / GOLDEN_CASES.length) * 100).toFixed(1);
  console.log(`\n${passed}/${GOLDEN_CASES.length} 통과 (${rate}%)`);

  if (failures.length > 0) {
    console.log("\n실패 상세:");
    for (const failure of failures) {
      console.log(`- "${failure.text}"`);
      console.log(`  기대: ${failure.expected}`);
      console.log(`  실제: ${failure.actual}`);
      console.log(`  참고: ${failure.note}`);
    }
  }

  process.exit(failures.length > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
