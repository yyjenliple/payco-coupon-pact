import type { HistoryFilter } from "@/lib/data/transfers";
import { kstMidnight, monthAgoKst } from "@/lib/format";

type SearchParams = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** "YYYY-MM-DD" → [year, monthIndex, day]; impossible dates like 2026-02-31 are rejected, not rolled over. */
function parseDay(v: string | undefined): [number, number, number] | null {
  const m = v?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]) - 1, Number(m[3])];
  const check = new Date(Date.UTC(y, mo, d));
  return check.getUTCFullYear() === y && check.getUTCMonth() === mo && check.getUTCDate() === d ? [y, mo, d] : null;
}

const parseId = (v: string | undefined) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : undefined;
};

export type HistoryParams = {
  filter: HistoryFilter;
  /** true when the user chose the period; false means "recent month, then keep scrolling into older records" */
  explicitPeriod: boolean;
};

export function parseHistoryParams(sp: SearchParams, now: Date): HistoryParams {
  const fromDay = parseDay(one(sp.from));
  const toDay = parseDay(one(sp.to));
  const explicitPeriod = !!(fromDay || toDay);
  const filter: HistoryFilter = {
    from: fromDay ? kstMidnight(...fromDay) : explicitPeriod ? undefined : monthAgoKst(now),
    to: toDay ? new Date(kstMidnight(toDay[0], toDay[1], toDay[2] + 1).getTime() - 1) : undefined,
    giverId: parseId(one(sp.giver)),
    receiverId: parseId(one(sp.receiver)),
    q: one(sp.q)?.trim() || undefined,
  };
  return { filter, explicitPeriod };
}
