import { Suspense } from "react";
import { HistoryFilters, type FilterPerson } from "@/app/(member)/history/_components/HistoryFilters";
import { requireAdmin } from "@/lib/auth/current-user";
import { listAdminRecords } from "@/lib/data/transfers";
import { allPeople, listMembers } from "@/lib/data/users";
import { getDb } from "@/lib/db/client";
import { formatKstDate, monthAgoKst } from "@/lib/format";
import { parseHistoryParams } from "@/lib/history-params";
import type { WireAdminFilter } from "../actions";
import { RecordManager } from "../_components/RecordManager";

export default function AdminRecordsPage({ searchParams }: PageProps<"/admin/records">) {
  return (
    <Suspense fallback={<div className="mx-auto h-[60dvh] max-w-[1040px]" />}>
      <RecordsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function RecordsContent({ searchParams }: { searchParams: PageProps<"/admin/records">["searchParams"] }) {
  const admin = await requireAdmin();
  const now = new Date();
  const { filter, explicitPeriod } = parseHistoryParams(await searchParams, now);
  const adminFilter = { ...filter, onlyMe: undefined };
  const db = await getDb();
  const [page, people, members] = await Promise.all([
    listAdminRecords(db, admin.id, adminFilter, null),
    allPeople(db),
    listMembers(db),
  ]);

  const filterPeople: FilterPerson[] = [...people.values()]
    .sort((a, b) => a.name.localeCompare(b.name, "ko"))
    .map(({ id, name, empNo, avatarPath }) => ({ id, name, empNo, avatarPath }));
  const wire: WireAdminFilter = { ...adminFilter, from: adminFilter.from?.getTime(), to: adminFilter.to?.getTime() };

  return (
    <RecordManager
      filter={wire}
      explicitPeriod={explicitPeriod}
      initialItems={page.items.map((i) => ({ ...i, givenAt: i.givenAt.getTime() }))}
      initialCursor={page.nextCursor}
      options={members.map(({ id, name, empNo }) => ({ id, name, empNo }))}
      filters={
        <HistoryFilters
          people={filterPeople}
          defaultFrom={formatKstDate(monthAgoKst(now))}
          today={formatKstDate(now)}
          placeholder="이름, 사번"
          showOnlyMe={false}
        />
      }
    />
  );
}
