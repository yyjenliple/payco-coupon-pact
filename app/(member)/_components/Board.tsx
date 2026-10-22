import { ArrowRight } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import type { BoardRow, PersonRef } from "@/lib/domain/balance";

function Tag({ children, tone }: { children: React.ReactNode; tone: "me" | "deleted" }) {
  return (
    <span className={`rounded px-1.5 py-px text-[11px] font-bold ${tone === "me" ? "bg-red-soft text-red" : "bg-surface text-sub"}`}>
      {children}
    </span>
  );
}

function CreditorChip({ person, count }: { person: PersonRef; count: number }) {
  return (
    <li className="flex w-16 flex-col items-center gap-0.5">
      <span className="relative px-1 pt-1">
        <Avatar person={person} size={40} />
        <span className="absolute -right-1 top-0 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red px-[5px] text-[11px] font-bold text-white ring-2 ring-bg">
          {count}
        </span>
      </span>
      <span className="max-w-full truncate text-xs font-semibold">{person.name}</span>
      <span className="font-num text-[11px] text-sub">{person.empNo}</span>
    </li>
  );
}

export function Board({ rows, meId }: { rows: BoardRow[]; meId: number }) {
  if (rows.length === 0) {
    return <p className="border-t border-line py-14 text-center text-sm text-sub">아직 밥 살 사람이 없어요</p>;
  }
  return (
    <ol>
      {rows.map((row, i) => {
        const first = i === 0;
        return (
          <li key={row.debtor.id} className="flex flex-col gap-3 border-t border-line py-4 md:flex-row md:items-center md:gap-5 md:px-1 md:py-5">
            <div className="flex items-center gap-3 md:w-[260px] md:shrink-0">
              <span className={`w-[18px] text-center font-display text-[22px] md:w-6 md:text-[28px] ${first ? "text-red" : "text-faint"}`}>
                {i + 1}
              </span>
              <Avatar person={row.debtor} size={40} className="md:size-12" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5">
                  <span className="truncate text-[15px] font-bold md:text-[17px]">{row.debtor.name}</span>
                  {row.debtor.id === meId && <Tag tone="me">나</Tag>}
                  {row.debtor.deleted && <Tag tone="deleted">삭제됨</Tag>}
                </p>
                <p className="font-num text-xs text-sub md:text-[13px]">{row.debtor.empNo}</p>
              </div>
              <Total count={row.total} first={first} className="md:hidden" />
            </div>
            <ul className="flex flex-wrap items-start gap-1 pl-[30px] md:flex-1 md:items-center md:gap-2 md:pl-0">
              <li className="hidden self-center md:block">
                <ArrowRight size={16} className="text-faint" />
              </li>
              {row.creditors.map((c) => (
                <CreditorChip key={c.person.id} person={c.person} count={c.count} />
              ))}
            </ul>
            <Total count={row.total} first={first} className="hidden md:flex md:w-[72px] md:justify-end" />
          </li>
        );
      })}
    </ol>
  );
}

function Total({ count, first, className }: { count: number; first: boolean; className: string }) {
  return (
    <span className={`flex items-end gap-0.5 ${first ? "text-red" : "text-ink"} ${className}`}>
      <span className="font-display text-[28px] leading-none md:text-4xl">{count}</span>
      <span className="text-[13px] font-semibold md:text-[15px]">장</span>
    </span>
  );
}
