import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { channels, comments } from "../src/lib/db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL 환경변수가 설정되지 않았습니다.");
}

const client = postgres(process.env.DATABASE_URL, { prepare: false });
const db = drizzle(client);

const VIDEO_IDS = ["aB3xQ9kLmZ0", "pQ7wRt2VbN8", "eF5jKl9XcW1", "mN4oPq8YsD2"];

const SAMPLES: Array<{
  text: string;
  riskLevel: "high" | "medium" | "low";
  category: string;
  confidence: number;
  reason: string;
  status: "confirmed" | "needs_review" | "reported_false";
  daysAgo: number;
}> = [
  {
    text: "너 진짜 인생 그렇게 살지마라 한심하다 정신병자냐",
    riskLevel: "high",
    category: "인신공격",
    confidence: 0.92,
    reason: "인신공격성 표현과 조롱이 명확하게 드러납니다.",
    status: "confirmed",
    daysAgo: 1,
  },
  {
    text: "이 사람 뒤에서 스폰서 돈 빼돌린다는 얘기 다 퍼졌던데 사실이잖아",
    riskLevel: "high",
    category: "명예훼손",
    confidence: 0.88,
    reason: "확인되지 않은 사실을 단정적으로 주장하며 명예를 훼손하고 있습니다.",
    status: "confirmed",
    daysAgo: 3,
  },
  {
    text: "너 사는 곳 알아냈다 조심해라",
    riskLevel: "high",
    category: "협박",
    confidence: 0.95,
    reason: "구체적인 위협을 암시하는 표현이 포함되어 있습니다.",
    status: "confirmed",
    daysAgo: 2,
  },
  {
    text: "몸매 하나는 볼만하네 벗고 찍은거 더 없냐",
    riskLevel: "high",
    category: "성희롱",
    confidence: 0.91,
    reason: "외모를 성적으로 대상화하는 성희롱성 발언입니다.",
    status: "confirmed",
    daysAgo: 5,
  },
  {
    text: "그냥 뒤지는게 나을듯 진심으로",
    riskLevel: "high",
    category: "인신공격",
    confidence: 0.87,
    reason: "극단적 표현으로 인신공격 소지가 있으나 맥락 추가 확인이 필요합니다.",
    status: "needs_review",
    daysAgo: 7,
  },
  {
    text: "이 사람 예전에 사기쳤다는 소문 있던데 사실이잖아",
    riskLevel: "medium",
    category: "허위사실",
    confidence: 0.72,
    reason: "확인되지 않은 사실을 단정적으로 서술하고 있어 명예훼손 소지가 있습니다.",
    status: "confirmed",
    daysAgo: 10,
  },
  {
    text: "저 채널 조회수 다 돈 주고 산거 아니냐",
    riskLevel: "medium",
    category: "명예훼손",
    confidence: 0.68,
    reason: "근거 없는 의혹 제기이나 단정 강도가 낮아 추가 검토가 필요합니다.",
    status: "needs_review",
    daysAgo: 12,
  },
  {
    text: "구독 안하면 후회함 진짜 개꿀정보 링크 눌러봐",
    riskLevel: "medium",
    category: "도배",
    confidence: 0.75,
    reason: "반복적인 홍보성 스팸 댓글로 판단됩니다.",
    status: "confirmed",
    daysAgo: 15,
  },
  {
    text: "이번 영상 진짜 실망이다 편집자 바꿔라",
    riskLevel: "medium",
    category: "단순비방",
    confidence: 0.7,
    reason: "비판적이지만 인신공격 요소가 일부 포함되어 있습니다.",
    status: "confirmed",
    daysAgo: 9,
  },
  {
    text: "말하는거 보니까 딱 답 나온다ㅋㅋ",
    riskLevel: "medium",
    category: "인신공격",
    confidence: 0.66,
    reason: "조롱성 표현이나 대상이 불분명해 추가 확인이 필요합니다.",
    status: "needs_review",
    daysAgo: 20,
  },
  {
    text: "그냥 컨텐츠가 좀 별로였음ㅋㅋ",
    riskLevel: "low",
    category: "단순비방",
    confidence: 0.58,
    reason: "부정적 의견에 가까우며 명백한 악성 표현으로 보기는 어렵습니다.",
    status: "confirmed",
    daysAgo: 25,
  },
  {
    text: "요즘 영상 퀄이 좀 떨어지는듯",
    riskLevel: "low",
    category: "단순비방",
    confidence: 0.55,
    reason: "단순 비판 의견으로 악성 여부 판단이 애매합니다.",
    status: "needs_review",
    daysAgo: 18,
  },
  {
    text: "ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ",
    riskLevel: "low",
    category: "도배",
    confidence: 0.6,
    reason: "의미없는 반복 텍스트로 낮은 위험도로 분류되었습니다.",
    status: "confirmed",
    daysAgo: 22,
  },
  {
    text: "얼굴이 좀 아쉽긴 하다",
    riskLevel: "low",
    category: "인신공격",
    confidence: 0.52,
    reason: "경미한 외모 언급이나 신고자에 의해 오탐으로 처리되었습니다.",
    status: "reported_false",
    daysAgo: 30,
  },
  {
    text: "이혼 사유가 불륜이라던데 다 알고있음",
    riskLevel: "high",
    category: "명예훼손",
    confidence: 0.93,
    reason: "사생활에 대한 허위 주장으로 명예훼손 소지가 매우 높습니다.",
    status: "confirmed",
    daysAgo: 4,
  },
  {
    text: "이런 영상 올릴거면 노출 좀 더 하지",
    riskLevel: "medium",
    category: "성희롱",
    confidence: 0.71,
    reason: "성적 대상화 표현이 포함되어 있으나 강도 확인이 필요합니다.",
    status: "needs_review",
    daysAgo: 14,
  },
  {
    text: "다음에 만나면 가만 안둔다",
    riskLevel: "high",
    category: "협박",
    confidence: 0.9,
    reason: "직접적인 위협 표현이 포함되어 있습니다.",
    status: "confirmed",
    daysAgo: 6,
  },
  {
    text: "예전 영상이 더 나았던듯",
    riskLevel: "low",
    category: "단순비방",
    confidence: 0.54,
    reason: "단순 비교 의견으로 낮은 위험도입니다.",
    status: "confirmed",
    daysAgo: 28,
  },
  {
    text: "저거 다 대본이고 연출이라던데",
    riskLevel: "medium",
    category: "허위사실",
    confidence: 0.69,
    reason: "근거 없는 주장이나 단정 강도가 낮아 추가 확인이 필요합니다.",
    status: "needs_review",
    daysAgo: 17,
  },
  {
    text: "머리가 나쁘니까 저런 짓을 하지",
    riskLevel: "high",
    category: "인신공격",
    confidence: 0.89,
    reason: "인신공격성 표현이나 신고자에 의해 오탐으로 처리되었습니다.",
    status: "reported_false",
    daysAgo: 11,
  },
];

async function main() {
  const [channel] = await db.select().from(channels).limit(1);
  if (!channel) {
    throw new Error("연동된 채널이 없습니다. 먼저 온보딩에서 채널을 연동하세요.");
  }

  const now = Date.now();
  const rows = SAMPLES.map((sample, index) => {
    const createdAt = new Date(now - sample.daysAgo * 24 * 60 * 60 * 1000);
    return {
      userId: channel.userId,
      videoId: VIDEO_IDS[index % VIDEO_IDS.length],
      youtubeCommentId: `mock-seed-${String(index + 1).padStart(2, "0")}`,
      authorChannelId: `UC_mock_${String(index + 1).padStart(3, "0")}`,
      text: sample.text,
      isMalicious: true,
      riskLevel: sample.riskLevel,
      category: sample.category,
      confidence: sample.confidence.toFixed(2),
      reason: sample.reason,
      status: sample.status,
      createdAt,
      analyzedAt: createdAt,
    };
  });

  const inserted = await db
    .insert(comments)
    .values(rows)
    .onConflictDoNothing({ target: comments.youtubeCommentId })
    .returning({ id: comments.id });

  console.log(`목업 댓글 ${inserted.length}개 추가 완료 (총 ${rows.length}개 중)`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
