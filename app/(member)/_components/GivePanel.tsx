"use client";

import { Check, Search, Ticket } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { giveCouponAction, withdrawAction } from "@/app/actions/common";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { MemoSheet } from "@/components/MemoSheet";
import { Sheet } from "@/components/Sheet";
import { useToast } from "@/components/Toast";
import { handleOf } from "@/lib/format";

export type GiveTarget = { id: number; name: string; account: string; empNo: string | null; avatarPath: string | null; status: string };

function useGive(meName: string) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState<GiveTarget | null>(null);
  const [memoFor, setMemoFor] = useState<number | null>(null);

  const give = (target: GiveTarget) =>
    start(async () => {
      const result = await giveCouponAction(target.id);
      setConfirming(null);
      if (!result.ok) return toast.show({ message: result.error, tone: "error" });
      toast.show({
        message: `${target.name}님에게 식권 1장 보냈어요`,
        actions: [
          { label: "메모", onClick: () => setMemoFor(result.transferId) },
          {
            label: "되돌리기",
            onClick: async () => {
              const undo = await withdrawAction(result.transferId);
              toast.show({ message: undo.ok ? "되돌렸어요" : undo.error, tone: undo.ok ? "success" : "error" });
            },
          },
        ],
      });
    });

  const dialogs = (
    <>
      <ConfirmDialog
        open={confirming !== null}
        title="식권을 보낼까요?"
        body={confirming ? `${meName}님이 ${confirming.name}님에게 식권 1장을 보내요.` : ""}
        confirmLabel="보내기"
        pending={pending}
        onConfirm={() => confirming && give(confirming)}
        onCancel={() => !pending && setConfirming(null)}
      />
      <MemoSheet transferId={memoFor} onClose={() => setMemoFor(null)} />
    </>
  );

  return { ask: setConfirming, pending, dialogs };
}

function TargetList({ targets, query, onGive, given, pending }: {
  targets: GiveTarget[];
  query: string;
  onGive: (t: GiveTarget) => void;
  given: Set<number>;
  pending: boolean;
}) {
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? targets.filter((t) => [t.name, t.account, t.empNo ?? ""].some((v) => v.toLowerCase().includes(q))) : targets;
  }, [targets, query]);

  if (filtered.length === 0) {
    return <p className="py-8 text-center text-sm text-sub">{targets.length === 0 ? "아직 식권을 줄 사람이 없어요" : "찾는 사람이 없어요"}</p>;
  }
  return (
    <ul className="flex flex-col">
      {filtered.map((t) => {
        const done = given.has(t.id);
        return (
          <li key={t.id} className="flex items-center gap-3 py-3">
            <Avatar person={t} size={40} />
            <div className="min-w-0 flex-1">
              <p className="flex items-baseline gap-1.5">
                <span className="truncate text-[15px] font-semibold">{t.name}</span>
                <span className="font-num text-xs text-sub">{handleOf(t.account)}</span>
              </p>
              <p className="text-xs text-sub">{t.status}</p>
            </div>
            <Button
              size="md"
              variant={done ? "secondary" : "soft"}
              disabled={done || pending}
              onClick={() => onGive(t)}
              className={done ? "text-sub" : ""}
            >
              {done && <Check size={14} />}
              {done ? "보냈어요" : "보내기"}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}

function SearchBox({ value, onChange, autoFocus, outlined }: { value: string; onChange: (v: string) => void; autoFocus?: boolean; outlined?: boolean }) {
  return (
    <label className={`flex h-12 items-center gap-2.5 rounded-xl px-3.5 ${outlined ? "border-[1.5px] border-line focus-within:border-red" : "bg-surface"}`}>
      <Search size={18} className="shrink-0 text-sub" />
      <input
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder="이름 or 이메일"
        aria-label="이름 or 이메일로 검색"
        className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-sub"
      />
    </label>
  );
}

/** Mobile: big button that opens a sheet. Desktop: an always-open "식권 보내기" section with inline search. */
/** `sentToday`: receiver ids of the coupons I gave today, one entry per coupon. */
export function GivePanel({ meName, targets, sentToday }: { meName: string; targets: GiveTarget[]; sentToday: number[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [inline, setInline] = useState("");
  const { ask, pending, dialogs } = useGive(meName);
  const given = new Set(sentToday);
  const todayLine = sentToday.length > 0 ? `오늘 ${sentToday.length}번 보냈어요` : "오늘은 아직 보내지 않았어요";

  return (
    <>
      <Button className="w-full md:hidden" onClick={() => setOpen(true)}>
        <Ticket size={20} />
        식권 보내기
      </Button>
      <p className="-mt-3 text-center text-[13px] text-sub md:hidden">{todayLine}</p>

      <section aria-labelledby="give-title" className="hidden flex-col gap-3 border-t border-line pt-5 md:flex">
        <div className="flex flex-col gap-1">
          <h2 id="give-title" className="flex items-center gap-2 font-display text-[22px]">
            <Ticket size={22} className="text-red" />
            식권 보내기
          </h2>
          <p className="text-[13px] text-sub">{todayLine}</p>
        </div>
        <div className="flex flex-col gap-1">
          <SearchBox value={inline} onChange={setInline} outlined />
          <div className="max-h-105 overflow-y-auto">
            <TargetList targets={targets} query={inline} onGive={ask} given={given} pending={pending} />
          </div>
        </div>
      </section>

      <Sheet open={open} onClose={() => setOpen(false)} title="누구한테 보낼까요?">
        <div className="flex flex-col gap-4">
          <p className="-mt-3 text-[13px] text-sub">{todayLine}</p>
          <SearchBox value={query} onChange={setQuery} />
          <TargetList targets={targets} query={query} onGive={ask} given={given} pending={pending} />
        </div>
      </Sheet>

      {dialogs}
    </>
  );
}
