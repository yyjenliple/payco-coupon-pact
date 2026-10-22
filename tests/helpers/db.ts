import { createPgliteDb, type Db } from "@/lib/db/client";
import { users, transfers } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";

export async function makeTestDb(): Promise<Db> {
  return createPgliteDb();
}

export async function addMember(db: Db, input: { name: string; account: string; empNo?: string }): Promise<number> {
  const [row] = await db
    .insert(users)
    .values({ name: input.name, account: input.account, empNo: input.empNo ?? null, passwordHash: await hashPassword("0000") })
    .returning({ id: users.id });
  return row.id;
}

export async function addTransfer(
  db: Db,
  input: { giverId: number; receiverId: number; givenAt?: Date; withdrawnBy?: number },
): Promise<number> {
  const givenAt = input.givenAt ?? new Date();
  const [row] = await db
    .insert(transfers)
    .values({
      giverId: input.giverId,
      receiverId: input.receiverId,
      givenAt,
      createdBy: input.giverId,
      withdrawnAt: input.withdrawnBy ? givenAt : null,
      withdrawnBy: input.withdrawnBy ?? null,
    })
    .returning({ id: transfers.id });
  return row.id;
}
