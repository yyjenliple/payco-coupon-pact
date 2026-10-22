import { and, desc, eq, gte, ilike, isNull, lt, lte, or, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { Db } from "@/lib/db/client";
import { memos, transfers, users } from "@/lib/db/schema";
import type { Edge, PersonRef } from "@/lib/domain/balance";
import { DomainError } from "@/lib/errors";
import { toId } from "@/lib/ids";

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

/** Non-admin account, deleted or not (records keep pointing at members who left). */
async function isMemberAccount(db: Db, id: number): Promise<boolean> {
  const [user] = await db.select({ isAdmin: users.isAdmin }).from(users).where(eq(users.id, id));
  return !!user && !user.isAdmin;
}

async function requireAdminUser(db: Db, adminId: number): Promise<void> {
  const user = await activeUser(db, adminId);
  if (!user?.isAdmin) throw new DomainError("FORBIDDEN", "관리자만 할 수 있어요");
}

export async function getTransfer(db: Db, transferId: number) {
  const [row] = await db.select().from(transfers).where(eq(transfers.id, toId(transferId)));
  if (!row) throw new DomainError("NOT_FOUND", "기록을 찾을 수 없어요");
  return row;
}

export async function giveCoupon(db: Db, actorId: number, receiverIdInput: number, now = new Date()): Promise<number> {
  const receiverId = toId(receiverIdInput);
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

/**
 * Parties must be active members, except a party that is already on the record (`keep`):
 * an admin can still fix the date of a record whose member has since been deleted.
 */
async function validateAdminInput(db: Db, raw: TransferInput, now: Date, keep: number[] = []): Promise<TransferInput> {
  const input = { giverId: toId(raw.giverId), receiverId: toId(raw.receiverId), givenAt: raw.givenAt };
  if (!(input.givenAt instanceof Date) || Number.isNaN(input.givenAt.getTime())) {
    throw new DomainError("INVALID", "일시를 입력해 주세요");
  }
  if (input.givenAt.getTime() > now.getTime()) throw new DomainError("INVALID", "미래 시각은 넣을 수 없어요");
  if (input.giverId === input.receiverId) throw new DomainError("INVALID", "준 사람과 받은 사람이 같아요");
  for (const id of [input.giverId, input.receiverId]) {
    const ok = keep.includes(id) ? await isMemberAccount(db, id) : await isActiveMember(db, id);
    if (!ok) throw new DomainError("INVALID", "회원만 선택할 수 있어요");
  }
  return input;
}

export async function adminCreateTransfer(db: Db, adminId: number, input: TransferInput, now = new Date()): Promise<number> {
  await requireAdminUser(db, adminId);
  const valid = await validateAdminInput(db, input, now);
  const [row] = await db
    .insert(transfers)
    .values({ ...valid, createdBy: adminId })
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
  const current = await getTransfer(db, transferId);
  const valid = await validateAdminInput(db, input, now, [current.giverId, current.receiverId]);
  await db
    .update(transfers)
    .set({ ...valid, editedAt: now, editedBy: adminId })
    .where(eq(transfers.id, transferId));
}

export async function adminDeleteTransfer(db: Db, adminId: number, transferId: number): Promise<void> {
  await requireAdminUser(db, adminId);
  await getTransfer(db, transferId);
  await db.delete(transfers).where(eq(transfers.id, transferId));
}

// ---------- reads ----------

export type HistoryFilter = {
  from?: Date;
  to?: Date;
  giverId?: number;
  receiverId?: number;
  onlyMe?: boolean;
  q?: string;
};

export type Cursor = { givenAt: number; id: number };

export type HistoryItem = {
  id: number;
  giver: PersonRef;
  receiver: PersonRef;
  givenAt: Date;
  withdrawnBy: PersonRef | null;
  edited: boolean;
  myMemo: string | null;
};

export type HistoryPage<T> = { items: T[]; nextCursor: Cursor | null };

export async function allEdges(db: Db): Promise<Edge[]> {
  const rows = await db
    .select({ giverId: transfers.giverId, receiverId: transfers.receiverId, withdrawnAt: transfers.withdrawnAt })
    .from(transfers);
  return rows.map((r) => ({ giverId: r.giverId, receiverId: r.receiverId, withdrawn: r.withdrawnAt !== null }));
}

const giver = alias(users, "giver");
const receiver = alias(users, "receiver");
const withdrawer = alias(users, "withdrawer");

const giverCols = {
  id: giver.id,
  name: giver.name,
  empNo: giver.empNo,
  avatarPath: giver.avatarPath,
  deletedAt: giver.deletedAt,
};
const receiverCols = {
  id: receiver.id,
  name: receiver.name,
  empNo: receiver.empNo,
  avatarPath: receiver.avatarPath,
  deletedAt: receiver.deletedAt,
};
const withdrawerCols = {
  id: withdrawer.id,
  name: withdrawer.name,
  empNo: withdrawer.empNo,
  avatarPath: withdrawer.avatarPath,
  deletedAt: withdrawer.deletedAt,
};

type PersonRow = { id: number; name: string; empNo: string; avatarPath: string | null; deletedAt: Date | null };
const toPerson = (p: PersonRow): PersonRef => ({
  id: p.id,
  name: p.name,
  empNo: p.empNo,
  avatarPath: p.avatarPath,
  deleted: p.deletedAt !== null,
});

const escapeLike = (q: string) => q.replace(/[\\%_]/g, (c) => `\\${c}`);

function baseConditions(filter: HistoryFilter, cursor: Cursor | null): (SQL | undefined)[] {
  if (cursor && (!Number.isFinite(cursor.givenAt) || !Number.isInteger(cursor.id))) {
    throw new DomainError("INVALID", "잘못된 요청이에요");
  }
  return [
    filter.from ? gte(transfers.givenAt, filter.from) : undefined,
    filter.to ? lte(transfers.givenAt, filter.to) : undefined,
    filter.giverId ? eq(transfers.giverId, filter.giverId) : undefined,
    filter.receiverId ? eq(transfers.receiverId, filter.receiverId) : undefined,
    cursor
      ? or(
          lt(transfers.givenAt, new Date(cursor.givenAt)),
          and(eq(transfers.givenAt, new Date(cursor.givenAt)), lt(transfers.id, cursor.id)),
        )
      : undefined,
  ];
}

function nameMatches(term: string): SQL | undefined {
  const pattern = `%${escapeLike(term)}%`;
  return or(
    ilike(giver.name, pattern),
    ilike(giver.empNo, pattern),
    ilike(receiver.name, pattern),
    ilike(receiver.empNo, pattern),
  );
}

function pageOf<T extends { id: number; givenAt: Date }>(rows: T[], limit: number): HistoryPage<T> {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const last = items[items.length - 1];
  return { items, nextCursor: hasMore && last ? { givenAt: last.givenAt.getTime(), id: last.id } : null };
}

/**
 * Member history. Memos are joined only for the viewer, so neither the returned memo
 * nor the text search can ever see another user's memo.
 */
export async function listHistory(
  db: Db,
  viewerId: number,
  filter: HistoryFilter,
  cursor: Cursor | null,
  limit = 30,
): Promise<HistoryPage<HistoryItem>> {
  const term = filter.q?.trim();
  const rows = await db
    .select({
      id: transfers.id,
      givenAt: transfers.givenAt,
      editedAt: transfers.editedAt,
      giver: giverCols,
      receiver: receiverCols,
      withdrawer: withdrawerCols,
      memo: memos.body,
    })
    .from(transfers)
    .innerJoin(giver, eq(giver.id, transfers.giverId))
    .innerJoin(receiver, eq(receiver.id, transfers.receiverId))
    .leftJoin(withdrawer, eq(withdrawer.id, transfers.withdrawnBy))
    .leftJoin(memos, and(eq(memos.transferId, transfers.id), eq(memos.userId, viewerId)))
    .where(
      and(
        ...baseConditions(filter, cursor),
        filter.onlyMe ? or(eq(transfers.giverId, viewerId), eq(transfers.receiverId, viewerId)) : undefined,
        term ? or(nameMatches(term), ilike(memos.body, `%${escapeLike(term)}%`)) : undefined,
      ),
    )
    .orderBy(desc(transfers.givenAt), desc(transfers.id))
    .limit(limit + 1);

  const page = pageOf(rows, limit);
  return {
    nextCursor: page.nextCursor,
    items: page.items.map((r) => ({
      id: r.id,
      giver: toPerson(r.giver),
      receiver: toPerson(r.receiver),
      givenAt: r.givenAt,
      withdrawnBy: r.withdrawer ? toPerson(r.withdrawer) : null,
      edited: r.editedAt !== null,
      myMemo: r.memo ?? null,
    })),
  };
}

export type AdminRecord = Omit<HistoryItem, "myMemo">;

/** Admin record list. Never joins memos. */
export async function listAdminRecords(
  db: Db,
  adminId: number,
  filter: Omit<HistoryFilter, "onlyMe">,
  cursor: Cursor | null,
  limit = 30,
): Promise<HistoryPage<AdminRecord>> {
  await requireAdminUser(db, adminId);
  const term = filter.q?.trim();
  const rows = await db
    .select({
      id: transfers.id,
      givenAt: transfers.givenAt,
      editedAt: transfers.editedAt,
      giver: giverCols,
      receiver: receiverCols,
      withdrawer: withdrawerCols,
    })
    .from(transfers)
    .innerJoin(giver, eq(giver.id, transfers.giverId))
    .innerJoin(receiver, eq(receiver.id, transfers.receiverId))
    .leftJoin(withdrawer, eq(withdrawer.id, transfers.withdrawnBy))
    .where(and(...baseConditions(filter, cursor), term ? nameMatches(term) : undefined))
    .orderBy(desc(transfers.givenAt), desc(transfers.id))
    .limit(limit + 1);

  const page = pageOf(rows, limit);
  return {
    nextCursor: page.nextCursor,
    items: page.items.map((r) => ({
      id: r.id,
      giver: toPerson(r.giver),
      receiver: toPerson(r.receiver),
      givenAt: r.givenAt,
      withdrawnBy: r.withdrawer ? toPerson(r.withdrawer) : null,
      edited: r.editedAt !== null,
    })),
  };
}
