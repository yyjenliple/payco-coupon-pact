"use client";

import { House, ReceiptText, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar, type AvatarPerson } from "./Avatar";

const ITEMS = [
  { href: "/", label: "홈", icon: House, match: (p: string) => p === "/" },
  { href: "/history", label: "이력", icon: ReceiptText, match: (p: string) => p.startsWith("/history") },
  { href: "/me", label: "마이", icon: UserRound, match: (p: string) => p.startsWith("/me") },
];

export function TopNav({ me }: { me: AvatarPerson }) {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-30 hidden h-[68px] items-center gap-10 border-b border-line bg-bg/95 px-10 backdrop-blur md:flex">
      <Link href="/" className="font-display text-2xl text-red">
        식권장부
      </Link>
      <nav className="flex flex-1 items-center gap-2">
        {ITEMS.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`rounded-lg px-3.5 py-2 text-[15px] ${active ? "bg-red-soft font-bold text-red" : "font-medium text-sub hover:text-ink"}`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <Link href="/me" className="flex items-center gap-2.5">
        <Avatar person={me} size={32} />
        <span className="text-sm font-semibold">{me.name}</span>
      </Link>
    </header>
  );
}

export function TabBar() {
  const pathname = usePathname();
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(12px,env(safe-area-inset-bottom))] md:hidden">
      <nav className="flex h-[60px] rounded-full border border-line bg-white/90 p-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.08)] backdrop-blur-xl">
        {ITEMS.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-[10px] ${
                active ? "bg-red-soft font-semibold text-red" : "font-medium text-sub"
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
