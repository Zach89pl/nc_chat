// Sesja logowania: podpisany token w cookie. Działa tylko na serwerze.
// Cookie zawiera wyłącznie datę wygaśnięcia i losowy identyfikator – nigdy hasło.
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "nyan_session";
export const SESSION_TTL_SECONDS = 8 * 60 * 60; // 8 godzin

const MIN_SECRET_LENGTH = 32;

function getSecret() {
  const secret = process.env.SESSION_SECRET?.trim();
  return secret && secret.length >= MIN_SECRET_LENGTH ? secret : null;
}

function getPassword() {
  const password = process.env.CHAT_PASSWORD;
  return password && password.trim() ? password : null;
}

// Brak konfiguracji oznacza zablokowany dostęp, a nie wyłączoną ochronę
export function authConfigured() {
  return getSecret() !== null && getPassword() !== null;
}

function sign(data: string, secret: string) {
  return createHmac("sha256", secret).update(data).digest("base64url");
}

export function createSessionToken() {
  const secret = getSecret();
  if (!secret) throw new Error("Brak SESSION_SECRET");
  const payload = Buffer.from(
    JSON.stringify({
      exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
      id: randomBytes(12).toString("base64url"),
    })
  ).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

export function verifySessionToken(token: string | undefined | null) {
  if (!token || !authConfigured()) return false;
  const secret = getSecret()!;

  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) return false;

  const expected = Buffer.from(sign(payload, secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return false;

  try {
    const { exp } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return typeof exp === "number" && exp > Date.now() / 1000;
  } catch {
    return false;
  }
}

// Porównanie w stałym czasie (skróty SHA-256 mają zawsze tę samą długość)
export function passwordMatches(input: string) {
  const password = getPassword();
  if (!password) return false;
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(password).digest();
  return timingSafeEqual(a, b);
}

export function sessionCookie(value: string, maxAge: number) {
  return {
    name: SESSION_COOKIE,
    value,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}
