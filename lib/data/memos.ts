import { and, eq, sql } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { memos } from "@/lib/db/schema";
import { getTransfer } from "@/lib/data/transfers";
import { DomainError } from "@/lib/errors";
import { toText } from "@/lib/ids";

export const MEMO_MAX = 200;

export async function saveMyMemo(db: Db, userId: number, transferId: number, body: string): Promise<void> {
  const transfer = await getTransfer(db, transferId);
  if (transfer.giverId !== userId && transfer.receiverId !== userId) {
    throw new DomainError("FORBIDDEN", "내 기록에만 메모를 남길 수 있어요");
  }
  const text = toText(body).trim();
  if (text.length > MEMO_MAX) throw new DomainError("INVALID", "메모는 200자까지 쓸 수 있어요");

  if (!text) {
    await db.delete(memos).where(and(eq(memos.transferId, transferId), eq(memos.userId, userId)));
    return;
  }
  await db
    .insert(memos)
    .values({ transferId, userId, body: text })
    .onConflictDoUpdate({ target: [memos.transferId, memos.userId], set: { body: text, updatedAt: sql`now()` } });
}
