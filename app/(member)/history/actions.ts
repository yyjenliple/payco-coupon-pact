"use server";

import { requireMember } from "@/lib/auth/current-user";
import { listHistory, type Cursor, type HistoryItem } from "@/lib/data/transfers";
import { getDb } from "@/lib/db/client";

export type WireFilter = {
  from?: number;
  to?: number;
  giverId?: number;
  receiverId?: number;
  onlyMe?: boolean;
  q?: string;
};

export type WireItem = Omit<HistoryItem, "givenAt"> & { givenAt: number };

export async function loadHistoryPage(
  filter: WireFilter,
  cursor: Cursor | null,
): Promise<{ items: WireItem[]; nextCursor: Cursor | null }> {
  const me = await requireMember();
  const page = await listHistory(
    await getDb(),
    me.id,
    {
      ...filter,
      from: filter.from !== undefined ? new Date(filter.from) : undefined,
      to: filter.to !== undefined ? new Date(filter.to) : undefined,
    },
    cursor,
  );
  return { nextCursor: page.nextCursor, items: page.items.map((i) => ({ ...i, givenAt: i.givenAt.getTime() })) };
}
