import { formatWon } from "@/lib/format";

function Counter({ label, value, red }: { label: string; value: number; red?: boolean }) {
  return (
    <div className="flex flex-1 flex-col gap-0.5">
      <span className="text-[13px] text-sub">{label}</span>
      <span className={`flex items-end gap-[3px] ${red ? "text-red" : "text-ink"}`}>
        <span className="font-display text-[52px] leading-none">{value}</span>
        <span className="text-base font-semibold">장</span>
      </span>
    </div>
  );
}

export function BalanceHero({ receive, owe, net }: { receive: number; owe: number; net: number }) {
  return (
    <section aria-label="내 잔액" className="flex flex-col gap-3.5">
      <div className="flex items-end">
        <Counter label="받을 식권" value={receive} />
        <span className="h-14 w-px bg-line" />
        <div className="flex flex-1 pl-5">
          <Counter label="갚을 식권" value={owe} red />
        </div>
      </div>
      <div className="flex items-center justify-between rounded-[10px] bg-surface px-3.5 py-2.5">
        <span className="text-[13px] text-sub">다 정산하면</span>
        <span className="text-[15px] font-bold">{formatWon(net)}</span>
      </div>
    </section>
  );
}
