"use client";

import { Calendar, Check, ChevronDown, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { inputClass } from "@/components/Field";
import { Sheet } from "@/components/Sheet";
import { handleOf } from "@/lib/format";

export type FilterPerson = { id: number; name: string; account: string; avatarPath: string | null };

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
      className={`flex h-8.5 shrink-0 items-center gap-1 rounded-full pl-3 pr-2.5 text-[13px] font-semibold md:h-10 md:gap-2 md:rounded-[10px] md:bg-bg md:px-3 md:text-ink ${
        active ? "bg-ink text-white md:ring-1 md:ring-ink" : "text-ink ring-1 ring-line"
      } ${calendar ? "md:w-67.5" : "md:w-37.5"}`}
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
                {p.name} <span className="font-num text-xs font-normal text-sub">{handleOf(p.account)}</span>
              </span>
              {selected === p.id && <Check size={18} className="text-red" />}
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}

/** Same calendar day `months` months before `ymd`, clamped to that month's last day. */
function monthsBefore(ymd: string, months: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m - months, 0)).getUTCDate();
  return new Date(Date.UTC(y, m - 1 - months, Math.min(d, lastDay))).toISOString().slice(0, 10);
}

function PeriodSheet({
  open,
  from,
  to,
  defaultFrom,
  today,
  onApply,
  onClose,
}: {
  open: boolean;
  from: string;
  to: string;
  defaultFrom: string;
  today: string;
  onApply: (from?: string, to?: string) => void;
  onClose: () => void;
}) {
  const [start, setStart] = useState(from);
  const [end, setEnd] = useState(to);
  const presets = [
    { label: "최근 3개월", from: monthsBefore(today, 3) },
    { label: "최근 1개월", from: defaultFrom },
    { label: "이번 달", from: `${today.slice(0, 8)}01` },
  ];
  const apply = () => {
    // The default range (최근 1개월) keeps the URL clean.
    if (start === defaultFrom && end === today) onApply(undefined, undefined);
    else onApply(start || undefined, end || undefined);
  };
  return (
    <Sheet open={open} onClose={onClose} title="기간">
      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          {presets.map((p) => {
            const active = start === p.from && end === today;
            return (
              <button
                key={p.label}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setStart(p.from);
                  setEnd(today);
                }}
                className={`h-9 flex-1 rounded-full text-[13px] font-semibold transition ${
                  active ? "bg-ink text-white" : "text-ink ring-1 ring-line hover:bg-surface"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
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
        <Button className="w-full" disabled={!start && !end} onClick={apply}>
          적용
        </Button>
      </div>
    </Sheet>
  );
}

export function HistoryFilters({
  people,
  defaultFrom,
  today,
  placeholder = "이름, 이메일, 내 메모 검색",
}: {
  people: FilterPerson[];
  defaultFrom: string;
  today: string;
  placeholder?: string;
}) {
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
  const giver = people.find((p) => String(p.id) === params.get("giver"));
  const receiver = people.find((p) => String(p.id) === params.get("receiver"));
  const close = () => setOpen(null);

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-2">
      <label className="flex h-11 items-center gap-2.5 rounded-xl bg-surface px-3.5 md:h-10 md:w-60 md:shrink-0 md:rounded-[10px] md:px-3">
        <Search size={18} className="shrink-0 text-sub" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-sub md:text-sm"
        />
      </label>
      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 md:mx-0 md:overflow-visible md:px-0">
        <Chip
          label="기간"
          value={`${from ?? defaultFrom} ~ ${to ?? today}`}
          active
          calendar
          onClick={() => setOpen("period")}
        />
        <Chip label="준 사람" value={giver?.name} active={!!giver} onClick={() => setOpen("giver")} />
        <Chip label="받은 사람" value={receiver?.name} active={!!receiver} onClick={() => setOpen("receiver")} />
      </div>

      <PeriodSheet
        key={`${from}-${to}-${open === "period"}`}
        open={open === "period"}
        from={from ?? defaultFrom}
        to={to ?? today}
        defaultFrom={defaultFrom}
        today={today}
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
