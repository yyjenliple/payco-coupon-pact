"use client";

import { Calendar, Check, ChevronDown, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { inputClass } from "@/components/Field";
import { Sheet } from "@/components/Sheet";

export type FilterPerson = { id: number; name: string; empNo: string; avatarPath: string | null };

function useParamsUpdater() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, start] = useTransition();
  const set = useCallback(
    (patch: Record<string, string | undefined>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      const qs = next.toString();
      start(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
    },
    [params, pathname, router],
  );
  return { params, set };
}

export function OnlyMeToggle({ variant }: { variant: "switch" | "checkbox" }) {
  const { params, set } = useParamsUpdater();
  const on = params.get("me") === "1";
  const toggle = () => set({ me: on ? undefined : "1" });

  if (variant === "checkbox") {
    return (
      <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={on} onChange={toggle} className="peer sr-only" />
        <span className="flex size-5 items-center justify-center rounded-md border border-line bg-bg peer-checked:border-red peer-checked:bg-red peer-focus-visible:outline-2 peer-focus-visible:outline-red">
          {on && <Check size={14} className="text-white" />}
        </span>
        나만 보기
      </label>
    );
  }
  return (
    <button type="button" role="switch" aria-checked={on} onClick={toggle} className="flex items-center gap-2 text-[13px] font-medium">
      나만 보기
      <span className={`flex h-6 w-10 items-center rounded-full p-[3px] transition ${on ? "bg-red" : "bg-line"}`}>
        <span className={`size-[18px] rounded-full bg-white shadow transition ${on ? "translate-x-4" : ""}`} />
      </span>
    </button>
  );
}

function Chip({
  label,
  value,
  active,
  calendar,
  onClick,
}: {
  label: string;
  value?: string;
  active: boolean;
  calendar?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-[34px] shrink-0 items-center gap-1 rounded-full pl-3 pr-2.5 text-[13px] font-semibold md:h-10 md:gap-2 md:rounded-[10px] md:bg-bg md:px-3 md:text-ink ${
        active ? "bg-ink text-white md:ring-1 md:ring-ink" : "text-ink ring-1 ring-line"
      } ${calendar ? "md:w-[270px]" : "md:w-[150px]"}`}
    >
      <span className="hidden font-normal text-sub md:inline">{label}</span>
      <span className="md:hidden">{value ?? label}</span>
      <span className={`hidden flex-1 truncate text-left md:inline ${calendar ? "font-num" : ""}`}>{value ?? "전체"}</span>
      {calendar && <Calendar size={16} className="hidden text-sub md:block" />}
      <ChevronDown size={14} className={calendar ? "md:hidden" : "md:text-sub"} />
    </button>
  );
}

function PersonPicker({
  open,
  title,
  people,
  selected,
  onPick,
  onClose,
}: {
  open: boolean;
  title: string;
  people: FilterPerson[];
  selected?: number;
  onPick: (id: number | undefined) => void;
  onClose: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <ul className="flex flex-col">
        <li>
          <button type="button" onClick={() => onPick(undefined)} className="flex w-full items-center justify-between py-3 text-[15px] font-semibold">
            전체 {selected === undefined && <Check size={18} className="text-red" />}
          </button>
        </li>
        {people.map((p) => (
          <li key={p.id}>
            <button type="button" onClick={() => onPick(p.id)} className="flex w-full items-center gap-3 py-2.5 text-left">
              <Avatar person={p} size={32} />
              <span className="flex-1 text-[15px] font-semibold">
                {p.name} <span className="font-num text-xs font-normal text-sub">{p.empNo}</span>
              </span>
              {selected === p.id && <Check size={18} className="text-red" />}
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}

function PeriodSheet({
  open,
  from,
  to,
  onApply,
  onClose,
}: {
  open: boolean;
  from: string;
  to: string;
  onApply: (from?: string, to?: string) => void;
  onClose: () => void;
}) {
  const [start, setStart] = useState(from);
  const [end, setEnd] = useState(to);
  return (
    <Sheet open={open} onClose={onClose} title="기간">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <input
            type="date"
            aria-label="시작일"
            value={start}
            max={end || undefined}
            onChange={(e) => setStart(e.target.value)}
            className={`${inputClass} font-num`}
          />
          <span className="text-sub">~</span>
          <input
            type="date"
            aria-label="종료일"
            value={end}
            min={start || undefined}
            onChange={(e) => setEnd(e.target.value)}
            className={`${inputClass} font-num`}
          />
        </div>
        <div className="flex gap-2.5">
          <Button variant="secondary" onClick={() => onApply(undefined, undefined)}>
            최근 1개월
          </Button>
          <Button className="flex-1" disabled={!start && !end} onClick={() => onApply(start || undefined, end || undefined)}>
            적용
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

export function HistoryFilters({ people, defaultFrom, today }: { people: FilterPerson[]; defaultFrom: string; today: string }) {
  const { params, set } = useParamsUpdater();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [open, setOpen] = useState<"period" | "giver" | "receiver" | null>(null);

  useEffect(() => {
    const current = params.get("q") ?? "";
    if (query.trim() === current) return;
    const id = setTimeout(() => set({ q: query.trim() || undefined }), 300);
    return () => clearTimeout(id);
  }, [query, params, set]);

  const from = params.get("from") ?? undefined;
  const to = params.get("to") ?? undefined;
  const explicit = !!(from || to);
  const giver = people.find((p) => String(p.id) === params.get("giver"));
  const receiver = people.find((p) => String(p.id) === params.get("receiver"));
  const close = () => setOpen(null);

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-2">
      <label className="flex h-11 items-center gap-2.5 rounded-xl bg-surface px-3.5 md:h-10 md:w-[240px] md:shrink-0 md:rounded-[10px] md:px-3">
        <Search size={18} className="shrink-0 text-sub" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="이름, 사번, 내 메모 검색"
          aria-label="이름, 사번, 내 메모 검색"
          className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-sub md:text-sm"
        />
      </label>
      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 md:mx-0 md:overflow-visible md:px-0">
        <Chip
          label="기간"
          value={explicit ? `${from ?? defaultFrom} ~ ${to ?? today}` : "최근 1개월"}
          active
          calendar
          onClick={() => setOpen("period")}
        />
        <Chip label="준 사람" value={giver?.name} active={!!giver} onClick={() => setOpen("giver")} />
        <Chip label="받은 사람" value={receiver?.name} active={!!receiver} onClick={() => setOpen("receiver")} />
      </div>
      <span className="hidden flex-1 md:block" />
      <span className="hidden md:block">
        <OnlyMeToggle variant="checkbox" />
      </span>

      <PeriodSheet
        key={`${from}-${to}-${open === "period"}`}
        open={open === "period"}
        from={from ?? defaultFrom}
        to={to ?? today}
        onClose={close}
        onApply={(f, t) => {
          set({ from: f, to: t });
          close();
        }}
      />
      <PersonPicker
        open={open === "giver"}
        title="준 사람"
        people={people}
        selected={giver?.id}
        onClose={close}
        onPick={(id) => {
          set({ giver: id ? String(id) : undefined });
          close();
        }}
      />
      <PersonPicker
        open={open === "receiver"}
        title="받은 사람"
        people={people}
        selected={receiver?.id}
        onClose={close}
        onPick={(id) => {
          set({ receiver: id ? String(id) : undefined });
          close();
        }}
      />
    </div>
  );
}
