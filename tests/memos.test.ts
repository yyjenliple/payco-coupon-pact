import { beforeEach, describe, expect, test } from "vitest";
import { and, eq } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { memos } from "@/lib/db/schema";
import { createMember } from "@/lib/data/users";
import { giveCoupon, withdrawTransfer } from "@/lib/data/transfers";
import { saveMyMemo } from "@/lib/data/memos";
import { makeTestDb } from "./helpers/db";

let db: Db;
let haneul: number, junho: number, seoyeon: number, t: number;
beforeEach(async () => {
  db = await makeTestDb();
  haneul = await createMember(db, { name: "김하늘", account: "haneul@corp.com" });
  junho = await createMember(db, { name: "박준호", account: "junho@corp.com" });
  seoyeon = await createMember(db, { name: "이서연", account: "seoyeon@corp.com" });
  t = await giveCoupon(db, haneul, junho);
});
const memoOf = async (userId: number) =>
  (await db.select().from(memos).where(and(eq(memos.transferId, t), eq(memos.userId, userId))))[0]?.body;

describe("saveMyMemo", () => {
  test("only a party can write a memo", async () => {
    await expect(saveMyMemo(db, seoyeon, t, "몰래")).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  test("200 char limit after trim", async () => {
    await saveMyMemo(db, haneul, t, ` ${"가".repeat(200)} `);
    expect(await memoOf(haneul)).toHaveLength(200);
    await expect(saveMyMemo(db, haneul, t, "가".repeat(201))).rejects.toMatchObject({ code: "INVALID", message: "메모는 200자까지 쓸 수 있어요" });
  });

  test("saving again updates the single memo; empty body deletes it", async () => {
    await saveMyMemo(db, haneul, t, "국밥");
    await saveMyMemo(db, haneul, t, "국밥 2");
    expect(await db.select().from(memos)).toHaveLength(1);
    expect(await memoOf(haneul)).toBe("국밥 2");
    await saveMyMemo(db, haneul, t, "   ");
    expect(await memoOf(haneul)).toBeUndefined();
  });

  test("giver and receiver keep separate memos on the same transfer", async () => {
    await saveMyMemo(db, haneul, t, "내가 삼");
    await saveMyMemo(db, junho, t, "얻어먹음");
    expect(await memoOf(haneul)).toBe("내가 삼");
    expect(await memoOf(junho)).toBe("얻어먹음");
  });

  test("withdrawn transfers still accept memos", async () => {
    await withdrawTransfer(db, haneul, t);
    await saveMyMemo(db, haneul, t, "잘못 줌");
    expect(await memoOf(haneul)).toBe("잘못 줌");
  });
});
