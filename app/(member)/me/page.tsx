import { Suspense } from "react";
import { requireMember } from "@/lib/auth/current-user";
import { ProfileForm } from "./ProfileForm";

export default function MePage() {
  return (
    <main className="mx-auto flex min-h-[calc(100dvh-112px)] w-full flex-col gap-7 px-5 pt-4 md:min-h-0 md:w-[440px] md:px-0 md:pb-16 md:pt-14">
      <h1 className="text-[22px] font-bold md:text-[28px]">마이</h1>
      <Suspense fallback={<div className="h-[420px] rounded-2xl bg-surface" />}>
        <MeContent />
      </Suspense>
    </main>
  );
}

async function MeContent() {
  const me = await requireMember();
  return <ProfileForm key={`${me.name}-${me.avatarPath}`} me={me} />;
}
