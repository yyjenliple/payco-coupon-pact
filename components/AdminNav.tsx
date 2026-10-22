"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/common";

const LINKS = [
  { href: "/admin", label: "회원 관리", match: (p: string) => p === "/admin" },
  { href: "/admin/records", label: "기록 관리", match: (p: string) => p.startsWith("/admin/records") },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <header className="border-b border-line bg-bg">
      <div className="flex h-[60px] items-center gap-3 px-5 md:h-[68px] md:gap-4 md:px-10">
        <Link href="/admin" className="font-display text-[22px] text-red md:text-2xl">
          식권장부
        </Link>
        <span className="rounded-[5px] bg-ink px-[7px] py-0.5 text-[11px] font-bold text-white">관리자</span>
        <nav className="ml-5 hidden items-center gap-2 md:flex">
          {LINKS.map((link) => {
            const active = link.match(pathname);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3.5 py-2 text-[15px] ${active ? "bg-red-soft font-bold text-red" : "font-medium text-sub hover:text-ink"}`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <span className="flex-1" />
        <span className="hidden font-num text-sm font-semibold md:inline">admin</span>
        <Link href="/account/password" className="text-[13px] text-sub underline underline-offset-2">
          비밀번호 변경
        </Link>
        <form action={logout}>
          <button type="submit" className="text-[13px] text-sub underline underline-offset-2">
            로그아웃
          </button>
        </form>
      </div>
      <nav className="mx-5 mb-3 flex gap-0.5 rounded-[10px] bg-surface p-[3px] md:hidden">
        {LINKS.map((link) => {
          const active = link.match(pathname);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex-1 rounded-lg py-1.5 text-center text-[13px] ${
                active ? "bg-bg font-semibold text-ink shadow-[0_1px_2px_rgba(0,0,0,0.06)]" : "font-medium text-sub"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
