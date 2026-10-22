import "server-only";

const MAX_FAILURES = 5;
const LOCK_MS = 5 * 60 * 1000;

type Entry = { failures: number; lockedUntil: number };

// In-memory: the app runs as a single long-lived server (see spec §6).
const attempts = new Map<string, Entry>();

const keyOf = (loginId: string) => loginId.trim().toLowerCase();

/** Minutes left on the lock, or 0 when the account may try again. */
export function lockedMinutes(loginId: string, now = Date.now()): number {
  const entry = attempts.get(keyOf(loginId));
  if (!entry || entry.lockedUntil <= now) return 0;
  return Math.ceil((entry.lockedUntil - now) / 60000);
}

export function recordFailure(loginId: string, now = Date.now()): void {
  const key = keyOf(loginId);
  const entry = attempts.get(key);
  const failures = entry && entry.lockedUntil <= now && entry.failures >= MAX_FAILURES ? 1 : (entry?.failures ?? 0) + 1;
  attempts.set(key, { failures, lockedUntil: failures >= MAX_FAILURES ? now + LOCK_MS : 0 });
}

export function clearFailures(loginId: string): void {
  attempts.delete(keyOf(loginId));
}
