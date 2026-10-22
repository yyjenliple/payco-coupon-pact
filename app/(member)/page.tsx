import Link from "next/link";
import { Suspense } from "react";
import { Avatar } from "@/components/Avatar";
import { Segment } from "@/components/Segment";
import { requireMember } from "@/lib/auth/current-user";
import { allEdges } from "@/lib/data/transfers";
import { allPeople, searchGiveTargets } from "@/lib/data/users";
import { getDb } from "@/lib/db/client";
import { buildBoard, computeNets, mySummary, owesOf, relationLabel, relationStatus } from "@/lib/domain/balance";
import { BalanceHero } from "./_components/BalanceHero";
import { Board } from "./_components/Board";
import { GivePanel, type GiveTarget } from "./_components/GivePanel";

export default function MainPage({ searchParams }: PageProps<"/">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MainContent searchParams={searchParams} />
    </Suspense>
  );
}

function PageSkeleton() {
  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-5 pt-4 md:flex-row md:gap-14 md:px-0 md:pt-10">
      <div className="h-[220px] rounded-2xl bg-surface md:w-[380px]" />
      <div className="h-[320px] flex-1 rounded-2xl bg-surface" />
    </div>
  );
}

async function MainContent({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const me = await requireMember();
  const scope = (await searchParams).scope === "me" ? "me" : "all";
  const db = await getDb();
  const [edges, people, members] = await Promise.all([allEdges(db), allPeople(db), searchGiveTargets(db, me.id, "")]);

  const nets = computeNets(edges);
  const owes = owesOf(nets);
  const summary = mySummary(owes, me.id);
  const board = buildBoard(owes, people, { scope, meId: me.id });
  const targets: GiveTarget[] = members.map((m) => ({
    id: m.id,
    name: m.name,
    empNo: m.empNo,
    avatarPath: m.avatarPath,
    status: relationLabel(relationStatus(nets, me.id, m.id)),
  }));

  return (
    <main className="mx-auto flex max-w-[1200px] flex-col gap-6 px-5 pt-4 md:flex-row md:items-start md:gap-14 md:px-0 md:pb-16 md:pt-10">
      <header className="flex items-center justify-between md:hidden">
        <span className="font-display text-2xl text-red">식권장부</span>
        <Link href="/me" aria-label="마이페이지">
          <Avatar person={me} size={34} />
        </Link>
      </header>

      <div className="flex flex-col gap-6 md:sticky md:top-[108px] md:w-[380px] md:shrink-0 md:gap-5">
        <BalanceHero receive={summary.receive} owe={summary.owe} net={summary.net} />
        <GivePanel targets={targets} />
      </div>

      <section aria-labelledby="board-title" className="flex flex-col pt-3 md:flex-1 md:pt-0">
        <div className="flex items-center justify-between pb-2 md:pb-4">
          <h2 id="board-title" className="font-display text-[22px] md:text-[28px]">
            밥 살 사람
          </h2>
          <Segment
            items={[
              { label: "전체", href: "/", active: scope === "all" },
              { label: "나", href: "/?scope=me", active: scope === "me" },
            ]}
          />
        </div>
        <Board rows={board} meId={me.id} />
      </section>
    </main>
  );
}
