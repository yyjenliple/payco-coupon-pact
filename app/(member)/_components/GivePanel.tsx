"use client";

import { Check, Search, Ticket } from "lucide-react";
import { useMemo, useRef, useState, useTransition, type RefObject } from "react";
import { giveCouponAction, withdrawAction } from "@/app/actions/common";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { MemoSheet } from "@/components/MemoSheet";
import { Sheet } from "@/components/Sheet";
import { useToast } from "@/components/Toast";

export type GiveTarget = { id: number; name: string; empNo: string; avatarPath: string | null; status: string };

function useGive() {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [given, setGiven] = useState<Set<number>>(new Set());
  const [memoFor, setMemoFor] = useState<number | null>(null);

  const give = (target: GiveTarget) =>
    start(async () => {
      const result = await giveCouponAction(target.id);
      if (!result.ok) return toast.show({ message: result.error });
      setGiven((prev) => new Set(prev).add(target.id));
      toast.show({
        message: `${target.name}님에게 식권 1장 쐈어요`,
        actions: [
          { label: "메모", onClick: () => setMemoFor(result.transferId) },
          {
            label: "되돌리기",
            onClick: async () => {
              const undo = await withdrawAction(result.transferId);
              setGiven((prev) => {
                const next = new Set(prev);
                next.delete(target.id);
                return next;
              });
              toast.show({ message: undo.ok ? "되돌렸어요" : undo.error });
            },
          },
        ],
      });
    });

  return { give, pending, given, memoFor, closeMemo: () => setMemoFor(null) };
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
    return q ? targets.filter((t) => t.name.toLowerCase().includes(q) || t.empNo.toLowerCase().includes(q)) : targets;
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
                <span className="font-num text-xs text-sub">{t.empNo}</span>
              </p>
              <p className="text-xs text-sub">{t.status}</p>
            </div>
            <Button
              size="md"
              variant={done ? "secondary" : "soft"}
              disabled={pending}
              onClick={() => onGive(t)}
              className={done ? "text-sub" : ""}
            >
              {done && <Check size={14} />}
              {done ? "쐈어요" : "쏘기"}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}

function SearchBox({ value, onChange, autoFocus, outlined, inputRef }: { value: string; onChange: (v: string) => void; autoFocus?: boolean; outlined?: boolean; inputRef?: RefObject<HTMLInputElement | null> }) {
  return (
    <label className={`flex h-12 items-center gap-2.5 rounded-xl px-3.5 ${outlined ? "border-[1.5px] border-line focus-within:border-red" : "bg-surface"}`}>
      <Search size={18} className="shrink-0 text-sub" />
      <input
        ref={inputRef}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder="이름이나 사번"
        aria-label="이름이나 사번으로 검색"
        className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-sub"
      />
    </label>
  );
}

/** Mobile: big button that opens a sheet. Desktop: inline search under the button. */
export function GivePanel({ targets }: { targets: GiveTarget[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [inline, setInline] = useState("");
  const { give, pending, given, memoFor, closeMemo } = useGive();
  const inlineRef = useRef<HTMLInputElement>(null);

  const onGiveClick = () => {
    if (window.matchMedia("(min-width: 768px)").matches) inlineRef.current?.focus();
    else setOpen(true);
  };

  return (
    <>
      <Button className="w-full" onClick={onGiveClick}>
        <Ticket size={20} />
        식권 쏘기
      </Button>

      <div className="hidden flex-col gap-1 pt-5 md:flex">
        <SearchBox value={inline} onChange={setInline} outlined inputRef={inlineRef} />
        <div className="max-h-[420px] overflow-y-auto">
          <TargetList targets={targets} query={inline} onGive={give} given={given} pending={pending} />
        </div>
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title="누구한테 쏠까요?">
        <div className="flex flex-col gap-4">
          <SearchBox value={query} onChange={setQuery} />
          <TargetList targets={targets} query={query} onGive={give} given={given} pending={pending} />
        </div>
      </Sheet>

      <MemoSheet transferId={memoFor} onClose={closeMemo} />
    </>
  );
}
