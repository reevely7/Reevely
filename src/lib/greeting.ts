type TimeSlot = "morning" | "afternoon" | "evening" | "night";

type MessageEntry = {
  text: string;
  /** 특정 시간대에서만 노출. 생략 시 모든 시간대에서 후보가 됨 */
  slots?: TimeSlot[];
  /** 특정 요일(0=일 ~ 6=토)에서만 노출. 생략 시 모든 요일에서 후보가 됨 */
  weekdays?: number[];
};

const HEADINGS: Record<TimeSlot, string> = {
  morning: "좋은 아침이에요! 🌤️",
  afternoon: "안녕하세요! 👋",
  evening: "오늘 하루도 고생하셨어요! 🫶",
  night: "늦은 시간까지 고생 많아요! 🌙",
};

const MONDAY = 1;
const FRIDAY = 5;
const WEEKEND = [0, 6];

const MESSAGES: MessageEntry[] = [
  // 시간대 무관 (15)
  { text: "오늘도 안전한 창작 활동을 응원해요." },
  { text: "악플 걱정은 잠시 내려놓고, 콘텐츠에 집중하세요." },
  { text: "오늘 하루도 편안한 마음으로 활동하세요." },
  { text: "든든하게 곁을 지키고 있을게요." },
  { text: "창작에만 집중할 수 있도록 저희가 도와드릴게요." },
  { text: "오늘도 좋은 콘텐츠로 채널이 성장하길 응원해요." },
  { text: "잠깐 둘러보고, 나머지는 저희에게 맡겨두세요." },
  { text: "채널의 안전은 저희가 함께 챙길게요." },
  { text: "오늘도 당신의 창작을 응원합니다." },
  { text: "무거운 댓글은 저희가 먼저 확인해둘게요." },
  { text: "오늘도 좋은 콘텐츠 기대할게요." },
  { text: "편안하게 시작하세요, 위험한 댓글은 저희가 먼저 봤어요." },
  { text: "오늘도 당신의 커뮤니티를 지키는 하루가 되길요." },
  { text: "콘텐츠가 더 멀리, 더 오래 가도록 함께할게요." },

  // 아침 05~11시 (8)
  { text: "좋은 아침이에요, 오늘 하루도 화이팅!", slots: ["morning"] },
  { text: "상쾌한 아침, 안전한 채널로 시작해요.", slots: ["morning"] },
  { text: "아침부터 채널을 든든하게 지켜드릴게요.", slots: ["morning"] },
  { text: "오늘 하루도 활기차게 시작해봐요.", slots: ["morning"] },
  { text: "커피 한 잔과 함께, 오늘의 댓글 현황을 확인해보세요.", slots: ["morning"] },
  { text: "아침 햇살처럼 밝은 하루 되세요.", slots: ["morning"] },
  { text: "오늘 하루의 시작, 안심하고 여세요.", slots: ["morning"] },
  { text: "새로운 하루, 새로운 콘텐츠를 응원해요.", slots: ["morning"] },

  // 오후 11~17시 (7)
  { text: "오후에도 힘내세요, 채널은 저희가 지키고 있어요.", slots: ["afternoon"] },
  { text: "점심은 챙기셨나요? 오후도 편안하게 보내세요.", slots: ["afternoon"] },
  { text: "바쁜 오후, 잠깐 채널 상태를 확인해보세요.", slots: ["afternoon"] },
  { text: "오늘 하루의 절반, 잘 달려오셨어요.", slots: ["afternoon"] },
  { text: "오후에도 안전한 창작 활동 이어가세요.", slots: ["afternoon"] },
  { text: "잠깐의 휴식과 함께, 채널 소식을 확인해보세요.", slots: ["afternoon"] },
  { text: "활기찬 오후 보내고 계신가요?", slots: ["afternoon"] },

  // 저녁 17~22시 (7)
  { text: "오늘 하루도 고생 많으셨어요.", slots: ["evening"] },
  { text: "저녁에도 채널은 저희가 지켜보고 있을게요.", slots: ["evening"] },
  { text: "하루를 마무리하며, 오늘의 댓글을 확인해보세요.", slots: ["evening"] },
  { text: "편안한 저녁 시간 보내세요.", slots: ["evening"] },
  { text: "오늘도 수고 많으셨어요, 잠깐 쉬어가세요.", slots: ["evening"] },
  { text: "하루의 끝, 안심하고 마무리하세요.", slots: ["evening"] },
  { text: "저녁노을처럼 차분한 하루 마무리 되세요.", slots: ["evening"] },

  // 밤 22~05시 (6)
  { text: "늦은 시간까지 고생 많으세요.", slots: ["night"] },
  { text: "밤에도 채널은 저희가 대신 지켜볼게요.", slots: ["night"] },
  { text: "오늘 하루도 애쓰셨어요, 편히 쉬세요.", slots: ["night"] },
  { text: "늦은 밤, 무리하지 말고 푹 쉬세요.", slots: ["night"] },
  { text: "잠든 사이에도 댓글을 살펴보고 있을게요.", slots: ["night"] },
  { text: "편안한 밤 되세요, 내일도 함께할게요.", slots: ["night"] },

  // 월요일 (3)
  { text: "새로운 한 주의 시작, 힘차게 응원할게요.", weekdays: [MONDAY] },
  { text: "월요일도 안전하게, 활기찬 한 주 되세요.", weekdays: [MONDAY] },
  { text: "한 주를 시작하는 당신을 응원합니다.", weekdays: [MONDAY] },

  // 금요일 (2)
  { text: "한 주 마무리, 정말 고생 많으셨어요.", weekdays: [FRIDAY] },
  { text: "금요일까지 달려오시느라 수고하셨어요.", weekdays: [FRIDAY] },

  // 주말 (2)
  { text: "주말에도 채널은 저희가 챙기고 있어요, 푹 쉬세요.", weekdays: WEEKEND },
  { text: "여유로운 주말 보내세요, 댓글은 저희에게 맡겨두세요.", weekdays: WEEKEND },
];

function getTimeSlot(hour: number): TimeSlot {
  if (hour >= 5 && hour < 11) return "morning";
  if (hour >= 11 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 22) return "evening";
  return "night";
}

function hashToIndex(seed: string, length: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % length;
}

export function pickGreeting(now: Date): { heading: string; message: string } {
  const slot = getTimeSlot(now.getHours());
  const weekday = now.getDay();

  const candidates = MESSAGES.filter(
    (m) =>
      (!m.slots || m.slots.includes(slot)) &&
      (!m.weekdays || m.weekdays.includes(weekday)),
  );

  const dateKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  const index = hashToIndex(`${dateKey}-${slot}`, candidates.length);

  return { heading: HEADINGS[slot], message: candidates[index].text };
}
