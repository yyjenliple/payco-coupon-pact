import { and, eq, isNull } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { transfers, users } from "@/lib/db/schema";
import { DomainError } from "@/lib/errors";

type TransferInput = { giverId: number; receiverId: number; givenAt: Date };

async function activeUser(db: Db, id: number) {
  const [user] = await db
    .select({ id: users.id, isAdmin: users.isAdmin })
    .from(users)
    .where(and(eq(users.id, id), isNull(users.deletedAt)));
  return user;
}

async function isActiveMember(db: Db, id: number): Promise<boolean> {
  const user = await activeUser(db, id);
  return !!user && !user.isAdmin;
}

async function requireAdminUser(db: Db, adminId: number): Promise<void> {
  const user = await activeUser(db, adminId);
  if (!user?.isAdmin) throw new DomainError("FORBIDDEN", "관리자만 할 수 있어요");
}

export async function getTransfer(db: Db, transferId: number) {
  const [row] = await db.select().from(transfers).where(eq(transfers.id, transferId));
  if (!row) throw new DomainError("NOT_FOUND", "기록을 찾을 수 없어요");
  return row;
}

export async function giveCoupon(db: Db, actorId: number, receiverId: number, now = new Date()): Promise<number> {
  if (!(await isActiveMember(db, actorId))) throw new DomainError("FORBIDDEN", "식권을 줄 수 없는 계정이에요");
  if (actorId === receiverId || !(await isActiveMember(db, receiverId))) {
    throw new DomainError("INVALID", "식권을 줄 수 없는 사람이에요");
  }
  const [row] = await db
    .insert(transfers)
    .values({ giverId: actorId, receiverId, givenAt: now, createdBy: actorId })
    .returning({ id: transfers.id });
  return row.id;
}

export async function withdrawTransfer(db: Db, actorId: number, transferId: number, now = new Date()): Promise<void> {
  const row = await getTransfer(db, transferId);
  if (row.giverId !== actorId && row.receiverId !== actorId) {
    throw new DomainError("FORBIDDEN", "내 기록만 철회할 수 있어요");
  }
  // guard on withdrawn_at so two concurrent withdrawals can't both win
  const updated = await db
    .update(transfers)
    .set({ withdrawnAt: now, withdrawnBy: actorId })
    .where(and(eq(transfers.id, transferId), isNull(transfers.withdrawnAt)))
    .returning({ id: transfers.id });
  if (updated.length === 0) throw new DomainError("CONFLICT", "이미 철회된 기록이에요");
}

async function validateAdminInput(db: Db, input: TransferInput, now: Date): Promise<void> {
  if (input.givenAt.getTime() > now.getTime()) throw new DomainError("INVALID", "미래 시각은 넣을 수 없어요");
  if (input.giverId === input.receiverId) throw new DomainError("INVALID", "준 사람과 받은 사람이 같아요");
  if (!(await isActiveMember(db, input.giverId)) || !(await isActiveMember(db, input.receiverId))) {
    throw new DomainError("INVALID", "회원만 선택할 수 있어요");
  }
}

export async function adminCreateTransfer(db: Db, adminId: number, input: TransferInput, now = new Date()): Promise<number> {
  await requireAdminUser(db, adminId);
  await validateAdminInput(db, input, now);
  const [row] = await db
    .insert(transfers)
    .values({ ...input, createdBy: adminId })
    .returning({ id: transfers.id });
  return row.id;
}

export async function adminUpdateTransfer(
  db: Db,
  adminId: number,
  transferId: number,
  input: TransferInput,
  now = new Date(),
): Promise<void> {
  await requireAdminUser(db, adminId);
  await getTransfer(db, transferId);
  await validateAdminInput(db, input, now);
  await db
    .update(transfers)
    .set({ ...input, editedAt: now, editedBy: adminId })
    .where(eq(transfers.id, transferId));
}

export async function adminDeleteTransfer(db: Db, adminId: number, transferId: number): Promise<void> {
  await requireAdminUser(db, adminId);
  await getTransfer(db, transferId);
  await db.delete(transfers).where(eq(transfers.id, transferId));
}
