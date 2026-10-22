import { Suspense } from "react";
import { Avatar } from "@/components/Avatar";
import { requireMember } from "@/lib/auth/current-user";
import { allEdges, listHistory } from "@/lib/data/transfers";
import { allPeople } from "@/lib/data/users";
import { getDb } from "@/lib/db/client";
import { computeNets, mySummary, owesOf, type PersonRef } from "@/lib/domain/balance";
import { formatKstDate, formatWon, monthAgoKst } from "@/lib/format";
import { parseHistoryParams } from "@/lib/history-params";
import type { WireFilter } from "./actions";
import { HistoryFilters, type FilterPerson } from "./_components/HistoryFilters";
import { HistoryList } from "./_components/HistoryList";

export default function HistoryPage({ searchParams }: PageProps<"/history">) {
  return (
    <Suspense fallback={<div className="mx-auto h-[60dvh] max-w-[960px] px-5 pt-4 md:px-0 md:pt-10" />}>
      <HistoryContent searchParams={searchParams} />
    </Suspense>
  );
}

function SummaryItem({ person, count, owe }: { person: PersonRef; count: number; owe: boolean }) {
  return (
    <li className="flex items-center gap-2.5 md:flex-1 md:rounded-xl md:bg-bg md:px-3.5 md:py-3">
      <Avatar person={person} size={28} className="md:size-8" />
      <span className="flex-1 text-sm md:hidden">
        {person.name}님에게 {owe ? "갚을" : "받을"} 식권
      </span>
      <span className="hidden flex-1 flex-col md:flex">
        <span className={`text-xs ${owe ? "font-semibold text-red" : "text-sub"}`}>{owe ? "갚을 식권" : "받을 식권"}</span>
        <span className="text-sm font-semibold">{person.name}</span>
      </span>
      <span className={`text-sm font-bold md:text-base ${owe ? "text-red" : ""}`}>{count}장</span>
    </li>
  );
}

async function HistoryContent({ searchParams }: { searchParams: PageProps<"/history">["searchParams"] }) {
  const me = await requireMember();
  const sp = await searchParams;
  const now = new Date();
  const { filter, explicitPeriod } = parseHistoryParams(sp, now);
  const db = await getDb();
  const [edges, people, firstPage] = await Promise.all([allEdges(db), allPeople(db), listHistory(db, me.id, filter, null)]);

  const summary = mySummary(owesOf(computeNets(edges)), me.id);
  const lines = [
    ...summary.oweTo.map((o) => ({ ...o, owe: true })),
    ...summary.receiveFrom.map((o) => ({ ...o, owe: false })),
  ].filter((l) => people.has(l.id));
  const filterPeople: FilterPerson[] = [...people.values()]
    .sort((a, b) => a.name.localeCompare(b.name, "ko"))
    .map(({ id, name, empNo, avatarPath }) => ({ id, name, empNo, avatarPath }));
  const wire: WireFilter = { ...filter, from: filter.from?.getTime(), to: filter.to?.getTime() };

  return (
    <main className="mx-auto flex max-w-[960px] flex-col gap-5 px-5 pt-4 md:gap-7 md:px-0 md:pb-16 md:pt-10">
      <h1 className="text-[22px] font-bold md:text-[28px]">이력</h1>

      <section aria-label="내 식권 잔액" className="flex flex-col gap-4 rounded-2xl bg-surface p-5 md:flex-row md:items-center md:gap-10 md:px-7 md:py-6">
        <div className="flex flex-col gap-1 md:w-[220px] md:shrink-0">
          <span className="text-[13px] text-sub">내 식권 잔액</span>
          <span className="text-[28px] font-bold md:text-[30px]">{formatWon(summary.net)}</span>
        </div>
        {lines.length > 0 && (
          <>
            <span className="hidden h-16 w-px bg-line md:block" />
            <ul className="flex flex-col gap-2.5 border-t border-line pt-4 md:flex-1 md:flex-row md:gap-3 md:border-0 md:pt-0">
              {lines.map((l) => (
                <SummaryItem key={l.id} person={people.get(l.id)!} count={l.count} owe={l.owe} />
              ))}
            </ul>
          </>
        )}
      </section>

      <HistoryFilters people={filterPeople} defaultFrom={formatKstDate(monthAgoKst(now))} today={formatKstDate(now)} />

      <HistoryList
        key={JSON.stringify(sp)}
        me={{ id: me.id, name: me.name }}
        filter={wire}
        explicitPeriod={explicitPeriod}
        initialItems={firstPage.items.map((i) => ({ ...i, givenAt: i.givenAt.getTime() }))}
        initialCursor={firstPage.nextCursor}
      />
    </main>
  );
}
