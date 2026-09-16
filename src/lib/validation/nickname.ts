export type NicknameError =
  | "empty"
  | "digits_only"
  | "incomplete_hangul"
  | "too_short"
  | "too_long";

export const NICKNAME_ERROR_MESSAGES: Record<NicknameError, string> = {
  empty: "닉네임을 입력해주세요.",
  digits_only: "닉네임은 숫자로만 만들 수 없습니다.",
  incomplete_hangul: "자음·모음만으로는 안 돼요. 완성된 글자로 입력해주세요.",
  too_short: "닉네임은 한글 1자 이상 또는 영문 등 3자 이상이어야 합니다.",
  too_long: "닉네임은 한글 최대 8자, 영문 최대 12자까지 가능합니다.",
};

export const NICKNAME_SPEC_GUIDE = "한글 최대 8자, 영문 최대 12자까지 가능해요.";

const HANGUL_REGEX = /[가-힣]/;
const INCOMPLETE_HANGUL_REGEX = /[ㄱ-ㅣ]/;
const DIGITS_ONLY_REGEX = /^[0-9]+$/;
const HANGUL_WEIGHT = 1.5;
const OTHER_WEIGHT = 1;
export const MAX_NICKNAME_WEIGHT = 12;
export const MAX_HANGUL_CHARS = 8;
export const MAX_OTHER_CHARS = 12;
const MIN_NON_HANGUL_LENGTH = 3;

export function containsHangul(value: string): boolean {
  return HANGUL_REGEX.test(value);
}

export function getNicknameWeight(value: string): number {
  let weight = 0;
  for (const char of value) {
    weight += HANGUL_REGEX.test(char) ? HANGUL_WEIGHT : OTHER_WEIGHT;
  }
  return weight;
}

export function validateNickname(value: string): NicknameError | null {
  if (!value) return "empty";
  if (DIGITS_ONLY_REGEX.test(value)) return "digits_only";
  if (INCOMPLETE_HANGUL_REGEX.test(value)) return "incomplete_hangul";

  const hasHangul = containsHangul(value);
  if (!hasHangul && value.length < MIN_NON_HANGUL_LENGTH) return "too_short";
  if (getNicknameWeight(value) > MAX_NICKNAME_WEIGHT) return "too_long";

  return null;
}
