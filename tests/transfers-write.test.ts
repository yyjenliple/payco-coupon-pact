import { beforeEach, describe, expect, test } from "vitest";
import { eq } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { transfers, users } from "@/lib/db/schema";
import { createMember, deleteMember } from "@/lib/data/users";
import {
  adminCreateTransfer,
  adminDeleteTransfer,
  adminUpdateTransfer,
  giveCoupon,
  withdrawTransfer,
} from "@/lib/data/transfers";
import { makeTestDb } from "./helpers/db";

let db: Db;
let admin: number, haneul: number, junho: number, seoyeon: number;
beforeEach(async () => {
  db = await makeTestDb();
  admin = (await db.select().from(users).where(eq(users.empNo, "admin")))[0].id;
  haneul = await createMember(db, { name: "김하늘", empNo: "10234" });
  junho = await createMember(db, { name: "박준호", empNo: "10412" });
  seoyeon = await createMember(db, { name: "이서연", empNo: "10087" });
});
const get = async (id: number) => (await db.select().from(transfers).where(eq(transfers.id, id)))[0];

describe("giveCoupon", () => {
  test("records me as giver at now", async () => {
    const now = new Date("2026-10-22T03:31:00Z");
    const id = await giveCoupon(db, haneul, junho, now);
    expect(await get(id)).toMatchObject({ giverId: haneul, receiverId: junho, createdBy: haneul, givenAt: now, withdrawnAt: null });
  });

  test("cannot give to myself, admin, or a deleted member", async () => {
    await expect(giveCoupon(db, haneul, haneul)).rejects.toMatchObject({ code: "INVALID" });
    await expect(giveCoupon(db, haneul, admin)).rejects.toMatchObject({ code: "INVALID" });
    await deleteMember(db, seoyeon);
    await expect(giveCoupon(db, haneul, seoyeon)).rejects.toMatchObject({ code: "INVALID" });
  });

  test("admin and deleted members cannot give", async () => {
    await expect(giveCoupon(db, admin, junho)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await deleteMember(db, haneul);
    await expect(giveCoupon(db, haneul, junho)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("withdrawTransfer", () => {
  test("giver or receiver can withdraw and withdrawnBy is recorded", async () => {
    const t1 = await giveCoupon(db, haneul, junho);
    await withdrawTransfer(db, junho, t1);
    expect(await get(t1)).toMatchObject({ withdrawnBy: junho });
    const t2 = await giveCoupon(db, haneul, junho);
    await withdrawTransfer(db, haneul, t2);
    expect((await get(t2)).withdrawnAt).toBeInstanceOf(Date);
  });

  test("third party cannot withdraw; second withdraw is rejected and keeps first withdrawer", async () => {
    const t = await giveCoupon(db, haneul, junho);
    await expect(withdrawTransfer(db, seoyeon, t)).rejects.toMatchObject({ code: "FORBIDDEN", message: "내 기록만 철회할 수 있어요" });
    await withdrawTransfer(db, haneul, t);
    await expect(withdrawTransfer(db, junho, t)).rejects.toMatchObject({ code: "CONFLICT", message: "이미 철회된 기록이에요" });
    expect((await get(t)).withdrawnBy).toBe(haneul);
  });

  test("missing transfer is NOT_FOUND", async () => {
    await expect(withdrawTransfer(db, haneul, 999)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("admin transfer management", () => {
  test("admin creates a backdated transfer", async () => {
    const givenAt = new Date("2026-01-05T03:00:00Z");
    const id = await adminCreateTransfer(db, admin, { giverId: haneul, receiverId: junho, givenAt });
    expect(await get(id)).toMatchObject({ givenAt, createdBy: admin });
  });

  test("admin edits set editedAt and editedBy", async () => {
    const t = await giveCoupon(db, haneul, junho);
    const givenAt = new Date("2026-10-01T03:00:00Z");
    await adminUpdateTransfer(db, admin, t, { giverId: seoyeon, receiverId: junho, givenAt });
    expect(await get(t)).toMatchObject({ giverId: seoyeon, givenAt, editedBy: admin });
    expect((await get(t)).editedAt).toBeInstanceOf(Date);
  });

  test("admin can delete a transfer", async () => {
    const t = await giveCoupon(db, haneul, junho);
    await adminDeleteTransfer(db, admin, t);
    expect(await get(t)).toBeUndefined();
  });

  test("non-admin calling admin functions is FORBIDDEN", async () => {
    const t = await giveCoupon(db, haneul, junho);
    const input = { giverId: haneul, receiverId: junho, givenAt: new Date("2026-10-01T03:00:00Z") };
    await expect(adminCreateTransfer(db, haneul, input)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(adminUpdateTransfer(db, haneul, t, input)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(adminDeleteTransfer(db, haneul, t)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  test("admin cannot create future-dated, self, or admin-party transfers", async () => {
    const future = new Date(Date.now() + 60 * 60 * 1000);
    await expect(adminCreateTransfer(db, admin, { giverId: haneul, receiverId: junho, givenAt: future })).rejects.toMatchObject({ message: "미래 시각은 넣을 수 없어요" });
    await expect(adminCreateTransfer(db, admin, { giverId: haneul, receiverId: haneul, givenAt: new Date() })).rejects.toMatchObject({ message: "준 사람과 받은 사람이 같아요" });
    await expect(adminCreateTransfer(db, admin, { giverId: admin, receiverId: haneul, givenAt: new Date() })).rejects.toMatchObject({ code: "INVALID" });
  });
});
