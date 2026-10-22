"use server";

import { refresh } from "next/cache";
import { requireAdmin } from "@/lib/auth/current-user";
import { asResult, type ActionResult } from "@/lib/action-result";
import {
  adminCreateTransfer,
  adminDeleteTransfer,
  adminUpdateTransfer,
  listAdminRecords,
  type AdminRecord,
  type Cursor,
} from "@/lib/data/transfers";
import { createMember, deleteMember, updateMember, type MemberInput } from "@/lib/data/users";
import { getDb } from "@/lib/db/client";
import { DomainError } from "@/lib/errors";
import { parseKstLocal } from "@/lib/format";

type RecordInput = { giverId: number; receiverId: number; givenAt: string };

async function run(fn: (adminId: number) => Promise<void>): Promise<ActionResult> {
  const admin = await requireAdmin();
  const result = await asResult(async () => {
    await fn(admin.id);
    return {};
  });
  refresh();
  return result;
}

export async function createMemberAction(input: MemberInput): Promise<ActionResult> {
  return run(async () => {
    await createMember(await getDb(), input);
  });
}

export async function updateMemberAction(id: number, input: MemberInput): Promise<ActionResult> {
  return run(async () => updateMember(await getDb(), id, input));
}

export async function deleteMemberAction(id: number): Promise<ActionResult> {
  return run(async () => deleteMember(await getDb(), id));
}

function toTransferInput(input: RecordInput) {
  const givenAt = parseKstLocal(input.givenAt);
  if (!givenAt) throw new DomainError("INVALID", "일시를 입력해 주세요");
  return { giverId: input.giverId, receiverId: input.receiverId, givenAt };
}

export async function createRecordAction(input: RecordInput): Promise<ActionResult> {
  return run(async (adminId) => {
    await adminCreateTransfer(await getDb(), adminId, toTransferInput(input));
  });
}

export async function updateRecordAction(id: number, input: RecordInput): Promise<ActionResult> {
  return run(async (adminId) => adminUpdateTransfer(await getDb(), adminId, id, toTransferInput(input)));
}

export async function deleteRecordAction(id: number): Promise<ActionResult> {
  return run(async (adminId) => adminDeleteTransfer(await getDb(), adminId, id));
}

export type WireRecord = Omit<AdminRecord, "givenAt"> & { givenAt: number };
export type WireAdminFilter = { from?: number; to?: number; giverId?: number; receiverId?: number; q?: string };

export async function loadAdminRecordsPage(
  filter: WireAdminFilter,
  cursor: Cursor | null,
): Promise<{ items: WireRecord[]; nextCursor: Cursor | null }> {
  const admin = await requireAdmin();
  const page = await listAdminRecords(
    await getDb(),
    admin.id,
    {
      ...filter,
      from: filter.from !== undefined ? new Date(filter.from) : undefined,
      to: filter.to !== undefined ? new Date(filter.to) : undefined,
    },
    cursor,
  );
  return { nextCursor: page.nextCursor, items: page.items.map((i) => ({ ...i, givenAt: i.givenAt.getTime() })) };
}
