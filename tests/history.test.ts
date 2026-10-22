import { beforeEach, describe, expect, test } from "vitest";
import { eq } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { listAdminRecords, listHistory } from "@/lib/data/transfers";
import { users } from "@/lib/db/schema";
import { addMember, addTransfer, makeTestDb } from "./helpers/db";

let db: Db;
let haneul: number, junho: number, seoyeon: number, minji: number;
let haneulToJunho: number, seoyeonToHaneul: number, junhoToMinji: number;
beforeEach(async () => {
  db = await makeTestDb();
  haneul = await addMember(db, { name: "김하늘", account: "haneul@corp.com" });
  junho = await addMember(db, { name: "박준호", account: "junho@corp.com" });
  seoyeon = await addMember(db, { name: "이서연", account: "seoyeon@corp.com" });
  minji = await addMember(db, { name: "최민지", account: "minji@corp.com" });
  haneulToJunho = await addTransfer(db, { giverId: haneul, receiverId: junho, givenAt: new Date("2026-10-01T03:00:00Z") });
  seoyeonToHaneul = await addTransfer(db, { giverId: seoyeon, receiverId: haneul, givenAt: new Date("2026-10-02T03:00:00Z") });
  junhoToMinji = await addTransfer(db, { giverId: junho, receiverId: minji, givenAt: new Date("2026-10-03T03:00:00Z") });
});

const ids = (page: { items: { id: number }[] }) => page.items.map((i) => i.id);

describe("listHistory", () => {
  test("a member only sees records they gave or received", async () => {
    expect(ids(await listHistory(db, haneul, {}, null))).toEqual([seoyeonToHaneul, haneulToJunho]);
    expect(ids(await listHistory(db, minji, {}, null))).toEqual([junhoToMinji]);
  });

  test("person filters cannot reach records the viewer is not part of", async () => {
    expect(ids(await listHistory(db, haneul, { giverId: junho }, null))).toEqual([]);
    expect(ids(await listHistory(db, haneul, { receiverId: junho }, null))).toEqual([haneulToJunho]);
  });

  test("name search stays inside the viewer's records", async () => {
    expect(ids(await listHistory(db, haneul, { q: "최민지" }, null))).toEqual([]);
  });
});

describe("listAdminRecords", () => {
  test("an admin sees every record and can filter by person", async () => {
    const [admin] = await db.select({ id: users.id }).from(users).where(eq(users.isAdmin, true));
    expect(ids(await listAdminRecords(db, admin.id, {}, null))).toEqual([junhoToMinji, seoyeonToHaneul, haneulToJunho]);
    expect(ids(await listAdminRecords(db, admin.id, { giverId: junho }, null))).toEqual([junhoToMinji]);
  });
});
