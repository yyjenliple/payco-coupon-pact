import { describe, expect, test } from "vitest";
import {
  computeNets,
  ledgerOf,
  mySummary,
  owesOf,
  relationLabel,
  relationStatus,
  type Edge,
  type PersonRef,
} from "@/lib/domain/balance";

const e = (giverId: number, receiverId: number, withdrawn = false): Edge => ({ giverId, receiverId, withdrawn });
const repeat = (n: number, edge: Edge) => Array.from({ length: n }, () => edge);

const names: Record<number, string> = { 1: "김하늘", 2: "이서연", 3: "박준호", 4: "최민지", 5: "정다은", 6: "한지훈", 7: "오세린" };
const people = new Map<number, PersonRef>(
  Object.entries(names).map(([id, name]) => [Number(id), { id: Number(id), name, account: `e${id}@corp.com`, avatarPath: null, deleted: false }]),
);

// Design sample: 민지 owes 서연2 지훈1 하늘1; 준호 owes 하늘2 서연1; 하늘 owes 다은1; 세린 owes 다은1
const sample: Edge[] = [
  ...repeat(2, e(2, 4)), e(6, 4), e(1, 4),
  ...repeat(2, e(1, 3)), e(2, 3),
  e(5, 1),
  e(5, 7),
];

describe("computeNets / owesOf", () => {
  test("nets cancel opposite directions", () => {
    const n = computeNets([e(1, 3), e(1, 3), e(1, 3), e(3, 1)]);
    expect(owesOf(n)).toEqual([{ debtorId: 3, creditorId: 1, count: 2 }]);
  });

  test("withdrawn edges are ignored", () => {
    expect(owesOf(computeNets([e(1, 3), e(1, 3, true)]))).toEqual([{ debtorId: 3, creditorId: 1, count: 1 }]);
  });

  test("withdrawn edge on the opposite side does not cancel", () => {
    expect(owesOf(computeNets([e(1, 3), e(1, 3), e(3, 1, true)]))).toEqual([{ debtorId: 3, creditorId: 1, count: 2 }]);
  });

  test("fully cancelled pair is settled, unknown pair is none", () => {
    const n = computeNets([e(1, 2), e(2, 1)]);
    expect(owesOf(n)).toEqual([]);
    expect(relationStatus(n, 1, 2)).toEqual({ kind: "settled", count: 0 });
    expect(relationStatus(n, 1, 3)).toEqual({ kind: "none", count: 0 });
  });

  test("relationStatus and labels from my point of view", () => {
    const n = computeNets(sample);
    expect(relationStatus(n, 1, 3)).toEqual({ kind: "receive", count: 2 });
    expect(relationStatus(n, 1, 5)).toEqual({ kind: "owe", count: 1 });
    expect(relationLabel({ kind: "receive", count: 2 })).toBe("2장 받을 차례");
    expect(relationLabel({ kind: "owe", count: 1 })).toBe("1장 갚을 차례");
    expect(relationLabel({ kind: "settled", count: 0 })).toBe("정산 끝");
    expect(relationLabel({ kind: "none", count: 0 })).toBe("주고받은 기록 없음");
  });
});

describe("ledgerOf", () => {
  test("totals per person I've traded with, most to receive first, then name", () => {
    const ledger = ledgerOf([...sample, e(1, 5), e(1, 5), e(4, 1)], people, 1);
    expect(ledger.map((r) => [r.person.name, r.sent, r.received, r.net])).toEqual([
      ["박준호", 2, 0, 2],
      ["정다은", 2, 1, 1],
      ["최민지", 1, 1, 0],
    ]);
  });

  test("people I owe go last; withdrawn coupons don't count; strangers are left out", () => {
    const ledger = ledgerOf([e(1, 3), e(2, 1), e(2, 1), e(1, 4, true), e(5, 6)], people, 1);
    expect(ledger.map((r) => [r.person.name, r.sent, r.received, r.net])).toEqual([
      ["박준호", 1, 0, 1],
      ["이서연", 0, 2, -2],
    ]);
  });
});

describe("mySummary", () => {
  test("receive 3, owe 1, net +2 with ordered lists", () => {
    expect(mySummary(owesOf(computeNets(sample)), 1)).toEqual({
      receive: 3,
      owe: 1,
      net: 2,
      oweTo: [{ id: 5, count: 1 }],
      receiveFrom: [
        { id: 3, count: 2 },
        { id: 4, count: 1 },
      ],
    });
  });
});
