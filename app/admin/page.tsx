import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/current-user";
import { listMembers } from "@/lib/data/users";
import { getDb } from "@/lib/db/client";
import { MemberManager } from "./_components/MemberManager";

export default function AdminMembersPage({ searchParams }: PageProps<"/admin">) {
  return (
    <Suspense fallback={<div className="mx-auto h-[60dvh] max-w-[960px]" />}>
      <MembersContent searchParams={searchParams} />
    </Suspense>
  );
}

async function MembersContent({ searchParams }: { searchParams: PageProps<"/admin">["searchParams"] }) {
  await requireAdmin();
  const q = (await searchParams).q;
  const query = (Array.isArray(q) ? q[0] : q)?.trim() ?? "";
  const members = await listMembers(await getDb(), query);
  return <MemberManager members={members} query={query} />;
}
