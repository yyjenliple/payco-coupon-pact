export type Edge = { giverId: number; receiverId: number; withdrawn: boolean };

export type PersonRef = {
  id: number;
  name: string;
  account: string;
  avatarPath: string | null;
  deleted: boolean;
};

export type Owe = { debtorId: number; creditorId: number; count: number };

/** Everything I've traded with one person. net > 0: they owe me, net < 0: I owe them. */
export type LedgerRow = { person: PersonRef; sent: number; received: number; net: number };

export type RelationStatus = { kind: "receive" | "owe" | "settled" | "none"; count: number };

const pairKey = (a: number, b: number) => (a < b ? `${a}:${b}` : `${b}:${a}`);

/** Net per pair keyed "min:max": count(min→max) − count(max→min), withdrawn edges excluded. */
export function computeNets(edges: Edge[]): Map<string, number> {
  const nets = new Map<string, number>();
  for (const edge of edges) {
    if (edge.withdrawn) continue;
    const key = pairKey(edge.giverId, edge.receiverId);
    const delta = edge.giverId < edge.receiverId ? 1 : -1;
    nets.set(key, (nets.get(key) ?? 0) + delta);
  }
  return nets;
}

export function owesOf(nets: Map<string, number>): Owe[] {
  const owes: Owe[] = [];
  for (const [key, net] of nets) {
    if (net === 0) continue;
    const [low, high] = key.split(":").map(Number);
    owes.push(net > 0 ? { debtorId: high, creditorId: low, count: net } : { debtorId: low, creditorId: high, count: -net });
  }
  return owes;
}

const byName = (a: PersonRef, b: PersonRef) => a.name.localeCompare(b.name, "ko");

/** One row per person I've traded with (withdrawn coupons excluded), most to receive first, then name. */
export function ledgerOf(edges: Edge[], people: Map<number, PersonRef>, meId: number): LedgerRow[] {
  const rows = new Map<number, LedgerRow>();
  for (const edge of edges) {
    if (edge.withdrawn) continue;
    const otherId = edge.giverId === meId ? edge.receiverId : edge.receiverId === meId ? edge.giverId : null;
    const person = otherId === null ? undefined : people.get(otherId);
    if (!person) continue;
    const row = rows.get(person.id) ?? { person, sent: 0, received: 0, net: 0 };
    if (edge.giverId === meId) row.sent++;
    else row.received++;
    row.net = row.sent - row.received;
    rows.set(person.id, row);
  }
  return [...rows.values()].sort((a, b) => b.net - a.net || byName(a.person, b.person));
}

export function mySummary(owes: Owe[], meId: number) {
  const oweTo = owes
    .filter((o) => o.debtorId === meId)
    .map((o) => ({ id: o.creditorId, count: o.count }))
    .sort((a, b) => b.count - a.count);
  const receiveFrom = owes
    .filter((o) => o.creditorId === meId)
    .map((o) => ({ id: o.debtorId, count: o.count }))
    .sort((a, b) => b.count - a.count);
  const owe = oweTo.reduce((sum, o) => sum + o.count, 0);
  const receive = receiveFrom.reduce((sum, o) => sum + o.count, 0);
  return { receive, owe, net: receive - owe, oweTo, receiveFrom };
}

export function relationStatus(nets: Map<string, number>, meId: number, otherId: number): RelationStatus {
  const key = pairKey(meId, otherId);
  if (!nets.has(key)) return { kind: "none", count: 0 };
  const net = nets.get(key)!;
  if (net === 0) return { kind: "settled", count: 0 };
  // positive net means the lower id is owed
  const meIsCreditor = net > 0 ? meId < otherId : meId > otherId;
  return { kind: meIsCreditor ? "receive" : "owe", count: Math.abs(net) };
}

export function relationLabel(status: RelationStatus): string {
  switch (status.kind) {
    case "receive":
      return `${status.count}장 받을 차례`;
    case "owe":
      return `${status.count}장 갚을 차례`;
    case "settled":
      return "정산 끝";
    case "none":
      return "주고받은 기록 없음";
  }
}
