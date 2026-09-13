import "server-only";

import crypto from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "reevely_admin_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12시간

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET 환경변수가 설정되지 않았습니다.");
  }
  return secret;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

// 별도 라이브러리 없이 HMAC으로 직접 서명하는 세션 토큰. 크리에이터 로그인
// (Supabase Auth/카카오)과 완전히 분리된 관리자 전용 세션이다.
export function createAdminSessionToken(adminId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ sub: adminId, exp: Date.now() + SESSION_TTL_MS }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyAdminSessionToken(token: string): string | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const actual = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (actual.length !== expectedBuf.length || !crypto.timingSafeEqual(actual, expectedBuf)) {
    return null;
  }

  try {
    const decoded: unknown = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    );
    if (
      typeof decoded !== "object" ||
      decoded === null ||
      typeof (decoded as { sub?: unknown }).sub !== "string" ||
      typeof (decoded as { exp?: unknown }).exp !== "number"
    ) {
      return null;
    }
    const { sub, exp } = decoded as { sub: string; exp: number };
    if (Date.now() > exp) return null;
    return sub;
  } catch {
    return null;
  }
}

export async function setAdminSessionCookie(adminId: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, createAdminSessionToken(adminId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/admin",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function clearAdminSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete({ name: COOKIE_NAME, path: "/admin" });
}

export async function getAdminIdFromSession(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyAdminSessionToken(token);
}
