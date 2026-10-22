import { Suspense } from "react";
import { requireMember } from "@/lib/auth/current-user";
import { TabBar, TopNav } from "@/components/MemberNav";

export default function MemberLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-bg" />}>
      <MemberShell>{children}</MemberShell>
    </Suspense>
  );
}

async function MemberShell({ children }: { children: React.ReactNode }) {
  const me = await requireMember();
  return (
    <div className="min-h-dvh pb-28 md:pb-0">
      <TopNav me={{ id: me.id, name: me.name, avatarPath: me.avatarPath }} />
      {children}
      <TabBar />
    </div>
  );
}
