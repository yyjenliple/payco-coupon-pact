import Link from "next/link";
import { Suspense } from "react";
import { AutoRefresh } from "@/components/AutoRefresh";
import { Avatar } from "@/components/Avatar";
import { RenderedAt } from "@/components/RenderedAt";
import { requireMember } from "@/lib/auth/current-user";
import { allEdges, sentToday } from "@/lib/data/transfers";
import { allPeople, searchGiveTargets } from "@/lib/data/users";
import { getDb } from "@/lib/db/client";
import { computeNets, ledgerOf, mySummary, owesOf, relationLabel, relationStatus } from "@/lib/domain/balance";
import { BalanceHero } from "./_components/BalanceHero";
import { Ledger } from "./_components/Ledger";
import { GivePanel, type GiveTarget } from "./_components/GivePanel";

export default function MainPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MainContent />
    </Suspense>
  );
}

function PageSkeleton() {
  return (
    <div className="mx-auto flex max-w-320 flex-col gap-6 px-5 pt-4 md:px-10 md:pt-10 lg:flex-row lg:gap-14">
      <div className="h-55 rounded-2xl bg-surface lg:w-95" />
      <div className="h-80 flex-1 rounded-2xl bg-surface" />
    </div>
  );
}

async function MainContent() {
  const me = await requireMember();
  const db = await getDb();
  const [edges, people, members, sent] = await Promise.all([
    allEdges(db),
    allPeople(db),
    searchGiveTargets(db, me.id, ""),
    sentToday(db, me.id),
  ]);

  const renderedAt = new Date();
  const nets = computeNets(edges);
  const owes = owesOf(nets);
  const summary = mySummary(owes, me.id);
  const ledger = ledgerOf(edges, people, me.id);
  const targets: GiveTarget[] = members.map((m) => ({
    id: m.id,
    name: m.name,
    account: m.account,
    empNo: m.empNo,
    avatarPath: m.avatarPath,
    status: relationLabel(relationStatus(nets, me.id, m.id)),
  }));

  return (
    <main className="mx-auto flex max-w-320 flex-col gap-6 px-5 pt-4 md:gap-8 md:px-10 md:pb-16 md:pt-10 lg:flex-row lg:items-start lg:gap-14">
      <AutoRefresh seconds={15} />
      <header className="flex items-center justify-between md:hidden">
        <span className="font-display text-2xl text-red">식권장부</span>
        <span className="flex items-center gap-3">
          <RenderedAt at={renderedAt} />
          <Link href="/me" aria-label="마이페이지">
            <Avatar person={me} size={34} />
          </Link>
        </span>
      </header>

      <div className="flex flex-col gap-6 md:gap-5 lg:sticky lg:top-27 lg:w-95 lg:shrink-0">
        <BalanceHero receive={summary.receive} owe={summary.owe} />
        <GivePanel meName={me.name} targets={targets} sentToday={sent} />
      </div>

      <section aria-labelledby="ledger-title" className="flex flex-col pt-3 md:pt-0 lg:flex-1">
        <div className="flex items-baseline justify-between gap-3 pb-2 md:pb-4">
          <h2 id="ledger-title" className="font-display text-[22px] md:text-[28px]">
            주고받은 식권
          </h2>
          <RenderedAt at={renderedAt} className="hidden md:block" />
        </div>
        <Ledger rows={ledger} />
      </section>
    </main>
  );
}
