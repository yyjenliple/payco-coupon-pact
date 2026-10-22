import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/current-user";
import { PasswordForm } from "./PasswordForm";

export default function PasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh" />}>
      <PasswordContent />
    </Suspense>
  );
}

async function PasswordContent() {
  const user = await requireUser();
  const backHref = user.isAdmin ? "/admin" : "/me";
  return (
    <main className="mx-auto flex min-h-dvh w-full flex-col gap-7 px-5 pb-8 pt-4 md:min-h-0 md:w-[440px] md:px-0 md:pt-14">
      <header className="flex items-center gap-2">
        <Link href={backHref} aria-label="뒤로" className="-ml-1.5">
          <ChevronLeft size={26} />
        </Link>
        <h1 className="text-[22px] font-bold">비밀번호 변경</h1>
      </header>
      <PasswordForm backHref={backHref} />
    </main>
  );
}
