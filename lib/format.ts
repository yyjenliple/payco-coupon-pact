export const COUPON_WON = 10000;

const AVATAR_COLORS = ["#FFE3D6", "#DDEBFF", "#E3F5E1", "#F3E4FF", "#FFF3C9", "#DFF4F4", "#FFE0EA"];
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

const pad = (n: number) => String(n).padStart(2, "0");

/** Wall-clock parts of the given instant in Asia/Seoul (fixed UTC+9, no DST). */
function kstParts(d: Date) {
  const k = new Date(d.getTime() + KST_OFFSET_MS);
  return { y: k.getUTCFullYear(), m: k.getUTCMonth(), day: k.getUTCDate(), h: k.getUTCHours(), min: k.getUTCMinutes() };
}

export function formatKst(d: Date): string {
  const p = kstParts(d);
  return `${p.y}-${pad(p.m + 1)}-${pad(p.day)} ${pad(p.h)}:${pad(p.min)}`;
}

/** "HH:MM:SS" in KST. */
export function formatKstTime(d: Date): string {
  const k = new Date(d.getTime() + KST_OFFSET_MS);
  return `${pad(k.getUTCHours())}:${pad(k.getUTCMinutes())}:${pad(k.getUTCSeconds())}`;
}

export function formatKstDate(d: Date): string {
  return formatKst(d).slice(0, 10);
}

/** Instant of KST midnight for the given KST calendar date. */
export function kstMidnight(y: number, m: number, day: number): Date {
  return new Date(Date.UTC(y, m, day) - KST_OFFSET_MS);
}

export function startOfKstDay(now: Date): Date {
  const p = kstParts(now);
  return kstMidnight(p.y, p.m, p.day);
}

export function monthAgoKst(now: Date): Date {
  const p = kstParts(now);
  const lastDay = new Date(Date.UTC(p.y, p.m, 0)).getUTCDate();
  return kstMidnight(p.y, p.m - 1, Math.min(p.day, lastDay));
}

export function initialsOf(name: string): string {
  return name.length >= 2 ? name.slice(-2) : name;
}

/** Short id shown under a name: the part of the email before "@". */
export function handleOf(account: string): string {
  const at = account.indexOf("@");
  return at > 0 ? account.slice(0, at) : account;
}

export function avatarColorOf(id: number): string {
  return AVATAR_COLORS[((id % AVATAR_COLORS.length) + AVATAR_COLORS.length) % AVATAR_COLORS.length];
}

/** "YYYY-MM-DDTHH:MM" (datetime-local, read as KST) → instant; null if malformed. */
export function parseKstLocal(value: string): Date | null {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m.map(Number);
  return new Date(kstMidnight(y, mo - 1, d).getTime() + (h * 60 + mi) * 60000);
}

/** Instant → "YYYY-MM-DDTHH:MM" in KST, for datetime-local inputs. */
export function toKstLocal(d: Date): string {
  return formatKst(d).replace(" ", "T");
}
