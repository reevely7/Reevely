export type NicknameError = "empty" | "digits_only" | "too_short" | "too_long";

export const NICKNAME_ERROR_MESSAGES: Record<NicknameError, string> = {
  empty: "닉네임을 입력해주세요.",
  digits_only: "닉네임은 숫자로만 만들 수 없습니다.",
  too_short: "닉네임은 한글 1자 이상 또는 영문 등 3자 이상이어야 합니다.",
  too_long: "닉네임은 한글 최대 8자, 영문 최대 12자까지 가능합니다.",
};

const HANGUL_REGEX = /[가-힣]/;
const DIGITS_ONLY_REGEX = /^[0-9]+$/;
const HANGUL_WEIGHT = 1.5;
const OTHER_WEIGHT = 1;
const MAX_WEIGHT = 12;
const MIN_NON_HANGUL_LENGTH = 3;

export function validateNickname(value: string): NicknameError | null {
  if (!value) return "empty";
  if (DIGITS_ONLY_REGEX.test(value)) return "digits_only";

  let hasHangul = false;
  let weight = 0;
  for (const char of value) {
    if (HANGUL_REGEX.test(char)) {
      hasHangul = true;
      weight += HANGUL_WEIGHT;
    } else {
      weight += OTHER_WEIGHT;
    }
  }

  if (!hasHangul && value.length < MIN_NON_HANGUL_LENGTH) return "too_short";
  if (weight > MAX_WEIGHT) return "too_long";

  return null;
}
