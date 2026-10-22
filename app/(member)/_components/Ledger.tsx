import { Avatar } from "@/components/Avatar";
import type { LedgerRow } from "@/lib/domain/balance";
import { handleOf } from "@/lib/format";

function Remaining({ net }: { net: number }) {
  if (net === 0) return <span className="text-sm font-semibold text-sub md:text-[15px]">정산 끝</span>;
  const owe = net < 0;
  return (
    <span className={`flex items-end gap-1 ${owe ? "text-red" : "text-ink"}`}>
      <span className="pb-px text-xs font-semibold md:text-[13px]">{owe ? "갚을" : "받을"}</span>
      <span className="font-display text-[26px] leading-none md:text-[32px]">{Math.abs(net)}</span>
      <span className="text-[13px] font-semibold md:text-[15px]">장</span>
    </span>
  );
}

const col = "hidden w-16 text-right font-num text-[15px] md:block";

/** People I've traded with: what I sent, what came back, and what's left — most to receive first. */
export function Ledger({ rows }: { rows: LedgerRow[] }) {
  if (rows.length === 0) {
    return <p className="border-t border-line py-14 text-center text-sm text-sub">아직 주고받은 식권이 없어요</p>;
  }
  return (
    <div>
      <div aria-hidden className="hidden items-center gap-5 px-1 pb-2.5 text-[13px] text-sub md:flex">
        <span className="flex-1" />
        <span className="w-16 text-right">보낸</span>
        <span className="w-16 text-right">받은</span>
        <span className="w-24 text-right">남은</span>
      </div>
      <ol>
        {rows.map((row, i) => (
          <li key={row.person.id} className="flex items-center gap-3 border-t border-line py-4 md:gap-5 md:px-1 md:py-5">
            <span className="w-[18px] shrink-0 text-center font-display text-[20px] text-faint md:w-6 md:text-[24px]">{i + 1}</span>
            <Avatar person={row.person} size={40} className="md:size-12" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5">
                <span className="truncate text-[15px] font-bold md:text-[17px]">{row.person.name}</span>
                {row.person.deleted && (
                  <span className="shrink-0 rounded bg-surface px-1.5 py-px text-[11px] font-bold text-sub">삭제됨</span>
                )}
              </p>
              <p className="font-num text-xs text-sub md:text-[13px]">{handleOf(row.person.account)}</p>
              <p className="mt-0.5 flex gap-2.5 text-xs text-sub md:hidden">
                <span>
                  보낸 <b className="font-num font-semibold text-ink">{row.sent}</b>
                </span>
                <span>
                  받은 <b className="font-num font-semibold text-ink">{row.received}</b>
                </span>
              </p>
            </div>
            <span className={col}>
              <span className="sr-only">보낸 </span>
              {row.sent}
            </span>
            <span className={col}>
              <span className="sr-only">받은 </span>
              {row.received}
            </span>
            <span className="flex shrink-0 justify-end md:w-24">
              <Remaining net={row.net} />
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
