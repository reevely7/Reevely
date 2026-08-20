import type { CommentAnalysis } from "../src/lib/ai/analyze-comment";

export type GoldenCase = {
  text: string;
  expected: Pick<CommentAnalysis, "is_malicious" | "category">;
  // 이 케이스가 왜 골든 케이스인지, 무엇과 헷갈리기 쉬운지 기록
  note: string;
};

// 프롬프트 버전을 바꿀 때마다 scripts/eval-prompt.ts로 이 목록을 돌려서
// 회귀(이전엔 맞았는데 새 버전에서 틀리는 것)가 없는지 확인한다.
// 새로 발견되는 오탐/미탐 사례는 여기에 계속 추가할 것.
export const GOLDEN_CASES: GoldenCase[] = [
  {
    text: "너 사는 곳 알아냈다 조심해라",
    expected: { is_malicious: true, category: "협박" },
    note: "신상 언급 + 위해 암시. 인신공격으로 새지 않아야 함",
  },
  {
    text: "찾아가서 죽여버린다",
    expected: { is_malicious: true, category: "협박" },
    note: "실행 의사가 명시된 위협. 아래 저주성 폭언 사례와 구분돼야 함",
  },
  {
    text: "그냥 뒤지는게 나을듯 진심으로",
    expected: { is_malicious: true, category: "인신공격" },
    note: "실제 발견된 오분류 사례(원래 허위사실로 잘못 분류됨). 실행 의사 없는 저주",
  },
  {
    text: "쟤 직원 월급 떼먹었다더라",
    expected: { is_malicious: true, category: "명예훼손" },
    note: "소문 인용 형식(~더라)도 사실 적시로 취급해야 함",
  },
  {
    text: "저거 다 대본이고 연출이라던데",
    expected: { is_malicious: true, category: "허위사실" },
    note: "실제 발견된 미탐지 사례(원래 해당없음으로 빠짐). 콘텐츠 진위 부정",
  },
  {
    text: "여자가 게임하면 다 그렇지 뭐",
    expected: { is_malicious: true, category: "혐오표현" },
    note: "성별이라는 집단 속성 기반 비하. 인신공격으로 새지 않아야 함",
  },
  {
    text: "와 몸매 실화냐 한번 만져보고 싶다",
    expected: { is_malicious: true, category: "성희롱" },
    note: "성적 대상화",
  },
  {
    text: "이걸 콘텐츠라고 만드냐ㅋㅋ 나이 먹고 뭐하는 짓인지",
    expected: { is_malicious: true, category: "비아냥" },
    note: "콘텐츠 평가를 넘어 사람을 향한 조롱",
  },
  {
    text: "영상은 잘 봤는데 얼굴은 진짜 못생겼네ㅋㅋ",
    expected: { is_malicious: true, category: "인신공격" },
    note: "칭찬+공격 혼합. 앞부분 호의에 안 흔들리고 공격 부분 기준으로 판정해야 함",
  },
  {
    text: "ㅄ이 무슨 방송을 하냐 정신차려라",
    expected: { is_malicious: true, category: "인신공격" },
    note: "초성으로 위장한 욕설(병신)도 원래 표현 기준으로 판정해야 함. 이전 " +
      "케이스(ㄷㅈ라)는 축약이 너무 모호해 더 널리 쓰이는 표현으로 교체",
  },
  {
    text: "광고 표기 안 하셨네요. 실망입니다",
    expected: { is_malicious: false, category: "해당없음" },
    note: "공개 활동에 대한 근거 있는 지적. 명예훼손으로 오탐되면 안 됨",
  },
  {
    text: "솔직히 이번 건 노잼이었음. 예전 영상이 나았다",
    expected: { is_malicious: false, category: "해당없음" },
    note: "신랄하지만 콘텐츠에 대한 감상. 비아냥으로 오탐되면 안 됨",
  },
  {
    text: "이번 영상은 편집이 좀 아쉽네요",
    expected: { is_malicious: false, category: "해당없음" },
    note: "정당한 콘텐츠 비평",
  },
  {
    text: "다른 사람들 댓글 진짜 욕 심하게 하네 수준하고는",
    expected: { is_malicious: false, category: "해당없음" },
    note: "크리에이터가 아니라 다른 시청자를 겨냥. 이 서비스의 보호 대상이 아님",
  },
];
