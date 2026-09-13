import "server-only";

import crypto from "node:crypto";

const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const derivedKey = crypto.scryptSync(password, salt, KEY_LENGTH);
  return `${salt.toString("base64")}.${derivedKey.toString("base64")}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [saltB64, keyB64] = storedHash.split(".");
  if (!saltB64 || !keyB64) return false;

  const salt = Buffer.from(saltB64, "base64");
  const storedKey = Buffer.from(keyB64, "base64");
  const derivedKey = crypto.scryptSync(password, salt, KEY_LENGTH);

  if (derivedKey.length !== storedKey.length) return false;
  return crypto.timingSafeEqual(derivedKey, storedKey);
}
