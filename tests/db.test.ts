import { describe, expect, test } from "vitest";
import { eq } from "drizzle-orm";
import { ensureAdmin } from "@/lib/db/client";
import { memos, transfers, users } from "@/lib/db/schema";
import { verifyPassword } from "@/lib/auth/password";
import { addMember, addTransfer, makeTestDb } from "./helpers/db";

describe("database foundation", () => {
  test("createDb seeds a hashed admin account", async () => {
    const db = await makeTestDb();
    const [admin] = await db.select().from(users).where(eq(users.account, "admin"));
    expect(admin?.isAdmin).toBe(true);
    expect(admin?.passwordHash).not.toBe("admin1234!");
    expect(await verifyPassword("admin1234!", admin!.passwordHash)).toBe(true);
  });

  test("ensureAdmin is idempotent", async () => {
    const db = await makeTestDb();
    await ensureAdmin(db);
    expect(await db.select().from(users).where(eq(users.account, "admin"))).toHaveLength(1);
  });

  test("account is unique only among active users", async () => {
    const db = await makeTestDb();
    const id = await addMember(db, { name: "박준호", account: "junho@corp.com" });
    await expect(addMember(db, { name: "박준호2", account: "junho@corp.com" })).rejects.toThrow();
    await db.update(users).set({ deletedAt: new Date() }).where(eq(users.id, id));
    await expect(addMember(db, { name: "박준호", account: "junho@corp.com" })).resolves.toBeTypeOf("number");
  });

  test("deleting a transfer cascades its memos", async () => {
    const db = await makeTestDb();
    const a = await addMember(db, { name: "김하늘", account: "haneul@corp.com" });
    const b = await addMember(db, { name: "박준호", account: "junho@corp.com" });
    const t = await addTransfer(db, { giverId: a, receiverId: b });
    await db.insert(memos).values({ transferId: t, userId: a, body: "국밥" });
    await db.delete(transfers).where(eq(transfers.id, t));
    expect(await db.select().from(memos)).toHaveLength(0);
  });
});
