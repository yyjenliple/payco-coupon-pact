import "server-only";
import { sealData, unsealData } from "iron-session";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "coupon_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type SessionData = { userId?: number };

function password(): string {
  const value = process.env.SESSION_PASSWORD;
  if (!value || value.length < 32) {
    throw new Error("SESSION_PASSWORD 환경변수가 없거나 32자보다 짧아요 (.env.local)");
  }
  return value;
}

export function sealSession(data: SessionData, pw: string): Promise<string> {
  return sealData(data, { password: pw, ttl: MAX_AGE_SECONDS });
}

export async function unsealSession(seal: string, pw: string): Promise<SessionData> {
  try {
    return await unsealData<SessionData>(seal, { password: pw, ttl: MAX_AGE_SECONDS });
  } catch {
    return {};
  }
}

export async function readSession(): Promise<SessionData> {
  const seal = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!seal) return {};
  return unsealSession(seal, password());
}

export async function writeSession(userId: number): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, await sealSession({ userId }, password()), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
