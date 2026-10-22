"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth/current-user";
import { clearSession } from "@/lib/auth/session";
import { saveMyMemo } from "@/lib/data/memos";
import { giveCoupon, withdrawTransfer } from "@/lib/data/transfers";
import { getDb } from "@/lib/db/client";
import { asResult, type ActionResult } from "@/lib/action-result";

export async function logout(): Promise<void> {
  await clearSession();
  redirect("/login");
}

export async function giveCouponAction(receiverId: number): Promise<ActionResult<{ transferId: number }>> {
  const me = await requireMember();
  const result = await asResult(async () => ({ transferId: await giveCoupon(await getDb(), me.id, receiverId) }));
  refresh();
  return result;
}

export async function withdrawAction(transferId: number): Promise<ActionResult> {
  const me = await requireMember();
  const result = await asResult(async () => {
    await withdrawTransfer(await getDb(), me.id, transferId);
    return {};
  });
  refresh();
  return result;
}

export async function saveMemoAction(transferId: number, body: string): Promise<ActionResult> {
  const me = await requireMember();
  const result = await asResult(async () => {
    await saveMyMemo(await getDb(), me.id, transferId, body);
    return {};
  });
  refresh();
  return result;
}
