"use client";

import { ArrowRight, ChevronDown, ChevronRight, ChevronUp, ChevronsDownUp, ChevronsUpDown, LoaderCircle, Lock, StickyNote, Undo2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { saveMemoAction, withdrawAction } from "@/app/actions/common";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { MemoTextarea } from "@/components/MemoSheet";
import { Sheet } from "@/components/Sheet";
import { useToast } from "@/components/Toast";
import type { Cursor } from "@/lib/data/transfers";
import type { PersonRef } from "@/lib/domain/balance";
import { formatKst } from "@/lib/format";
import { loadHistoryPage, type WireFilter, type WireItem } from "../actions";
import { OnlyMeToggle } from "./HistoryFilters";

const COLLAPSE_KEY = "history.memos.collapsed";

const COLLAPSE_EVENT = "history-memos-collapsed";
let collapsedFallback = false;

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return collapsedFallback;
  }
}

function writeCollapsed(value: boolean) {
  collapsedFallback = value;
  try {
    localStorage.setItem(COLLAPSE_KEY, value ? "1" : "0");
  } catch {
    // storage unavailable (private mode): the in-memory fallback keeps the toggle working for this visit
  }
  window.dispatchEvent(new Event(COLLAPSE_EVENT));
}

function subscribeCollapsed(onChange: () => void) {
  window.addEventListener(COLLAPSE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(COLLAPSE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

type Me = { id: number; name: string };

function Tag({ children, tone }: { children: React.ReactNode; tone: "red" | "gray" | "amber" }) {
  const tones = { red: "bg-red-soft text-red", gray: "bg-surface text-sub", amber: "bg-amber-soft text-amber" };
  return <span className={`shrink-0 rounded px-1.5 py-px text-[11px] font-bold ${tones[tone]}`}>{children}</span>;
}

function MemoBlock({ text, onEdit }: { text: string; onEdit?: () => void }) {
  return (
    <div className="flex items-start gap-2 rounded-[10px] bg-surface px-3 py-2.5">
      <Lock size={13} className="mt-[3px] shrink-0 text-sub" />
      <p className="flex-1 whitespace-pre-wrap break-words text-[13px] leading-normal">{text}</p>
      {onEdit && (
        <button type="button" onClick={onEdit} className="shrink-0 text-xs text-sub underline underline-offset-2">
          수정
        </button>
      )}
    </div>
  );
}

function MemoToggle({ open, onClick, label }: { open: boolean; onClick: () => void; label?: string }) {
  const Caret = open ? ChevronUp : ChevronDown;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-label={open ? "메모 접기" : "메모 펼치기"}
      className={`flex h-7 shrink-0 items-center gap-1 rounded-lg px-2 text-[13px] md:h-8 md:px-2.5 ${open ? "bg-ink text-white" : "bg-surface text-ink md:bg-transparent"}`}
    >
      <StickyNote size={13} />
      {label && <span className="hidden font-semibold md:inline">{label}</span>}
      <Caret size={13} />
    </button>
  );
}

function PersonCell({ person, faded }: { person: PersonRef; faded: boolean }) {
  return (
    <span className={`flex w-[260px] shrink-0 items-center gap-2.5 ${faded ? "opacity-50" : ""}`}>
      <Avatar person={person} size={28} />
      <span className={`text-sm font-semibold ${faded ? "line-through" : ""}`}>{person.name}</span>
      <span className="font-num text-xs text-sub">{person.empNo}</span>
      {person.deleted && <Tag tone="gray">삭제됨</Tag>}
    </span>
  );
}

function Row({
  item,
  me,
  memoOpen,
  onToggleMemo,
  onOpenSheet,
  onEditMemo,
  onWithdraw,
}: {
  item: WireItem;
  me: Me;
  memoOpen: boolean;
  onToggleMemo: () => void;
  onOpenSheet: () => void;
  onEditMemo: () => void;
  onWithdraw: () => void;
}) {
  const mine = item.giver.id === me.id || item.receiver.id === me.id;
  const withdrawn = !!item.withdrawnBy;
  const canWithdraw = mine && !withdrawn;
  const date = formatKst(new Date(item.givenAt));
  const nameClass = `text-[15px] font-semibold ${withdrawn ? "text-sub line-through" : ""}`;

  return (
    <li className="flex flex-col gap-2.5 border-b border-line py-3.5 md:px-4">
      {/* mobile */}
      <div className="flex items-center gap-2.5 md:hidden">
        <button type="button" disabled={!mine} onClick={onOpenSheet} className="flex min-w-0 flex-1 flex-col gap-[3px] text-left">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className={nameClass}>{item.giver.name}</span>
            <ArrowRight size={14} className="text-sub" />
            <span className={nameClass}>{item.receiver.name}</span>
            {withdrawn ? (
              <Tag tone="gray">철회됨</Tag>
            ) : item.giver.id === me.id ? (
              <Tag tone="red">보냄</Tag>
            ) : item.receiver.id === me.id ? (
              <Tag tone="gray">받음</Tag>
            ) : null}
            {item.edited && <Tag tone="amber">수정됨</Tag>}
          </span>
          <span className="flex items-center gap-2">
            <span className="font-num text-[13px] text-sub">{date}</span>
            {item.withdrawnBy && <span className="text-xs text-sub">{item.withdrawnBy.name}님이 철회</span>}
          </span>
        </button>
        {item.myMemo && <MemoToggle open={memoOpen} onClick={onToggleMemo} />}
        {mine && !withdrawn && <ChevronRight size={18} className="shrink-0 text-faint" aria-hidden />}
      </div>

      {/* desktop */}
      <div className="hidden items-center md:flex">
        <PersonCell person={item.giver} faded={withdrawn} />
        <PersonCell person={item.receiver} faded={withdrawn} />
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <span className={`font-num text-sm ${withdrawn ? "text-sub" : ""}`}>{date}</span>
          {item.withdrawnBy && <Tag tone="gray">{item.withdrawnBy.name}님이 철회</Tag>}
          {item.edited && <Tag tone="amber">수정됨</Tag>}
        </span>
        <span className="flex w-[180px] shrink-0 items-center justify-end gap-1">
          {mine &&
            (item.myMemo ? (
              <MemoToggle open={memoOpen} onClick={onToggleMemo} label="메모" />
            ) : (
              <button type="button" onClick={onEditMemo} className="flex h-8 items-center gap-1 rounded-lg px-2.5 text-[13px] text-sub hover:bg-surface">
                <StickyNote size={14} />
                메모 추가
              </button>
            ))}
          {canWithdraw && (
            <button type="button" onClick={onWithdraw} className="flex h-8 items-center gap-1 rounded-lg px-2.5 text-[13px] text-red hover:bg-red-soft">
              <Undo2 size={14} />
              철회
            </button>
          )}
        </span>
      </div>

      {item.myMemo && memoOpen && (
        <div className="md:pl-[38px]">
          <MemoBlock text={item.myMemo} onEdit={onEditMemo} />
        </div>
      )}
    </li>
  );
}

function RecordSheet({
  item,
  me,
  onClose,
  onSaved,
  onWithdraw,
}: {
  item: WireItem | null;
  me: Me;
  onClose: () => void;
  onSaved: (id: number, memo: string | null) => void;
  onWithdraw: (item: WireItem) => void;
}) {
  const [body, setBody] = useState(item?.myMemo ?? "");
  const [pending, start] = useTransition();
  const toast = useToast();
  if (!item) return null;
  const canWithdraw = !item.withdrawnBy && (item.giver.id === me.id || item.receiver.id === me.id);

  const side = (p: PersonRef, role: string) => (
    <span className="flex w-24 flex-col items-center gap-1">
      <Avatar person={p} size={44} />
      <span className="text-sm font-bold">{p.name}</span>
      <span className="text-xs text-sub">{role}</span>
    </span>
  );

  return (
    <Sheet open onClose={onClose} title="기록 상세">
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between rounded-[14px] border border-line p-4">
          {side(item.giver, "준 사람")}
          <span className="flex flex-col items-center gap-1.5">
            <ArrowRight size={20} className="text-red" />
            <span className="font-num text-xs text-sub">{formatKst(new Date(item.givenAt))}</span>
          </span>
          {side(item.receiver, "받은 사람")}
        </div>
        <MemoTextarea value={body} onChange={setBody} />
        <div className="flex gap-2.5">
          {canWithdraw && (
            <Button variant="danger" onClick={() => onWithdraw(item)}>
              <Undo2 size={16} />
              철회
            </Button>
          )}
          <Button
            className="flex-1"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const result = await saveMemoAction(item.id, body);
                if (!result.ok) return toast.show({ message: result.error });
                onSaved(item.id, body.trim() || null);
                onClose();
                toast.show({ message: "메모를 저장했어요" });
              })
            }
          >
            메모 저장
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

function DesktopMemoEditor({ item, onClose, onSaved }: { item: WireItem; onClose: () => void; onSaved: (id: number, memo: string | null) => void }) {
  const [body, setBody] = useState(item.myMemo ?? "");
  const [pending, start] = useTransition();
  const toast = useToast();
  return (
    <Sheet open onClose={onClose} title="내 메모">
      <div className="flex flex-col gap-5">
        <MemoTextarea value={body} onChange={setBody} autoFocus />
        <Button
          disabled={pending}
          onClick={() =>
            start(async () => {
              const result = await saveMemoAction(item.id, body);
              if (!result.ok) return toast.show({ message: result.error });
              onSaved(item.id, body.trim() || null);
              onClose();
              toast.show({ message: "메모를 저장했어요" });
            })
          }
        >
          메모 저장
        </Button>
      </div>
    </Sheet>
  );
}

/** A page that arrives after a refresh may overlap rows we already show. */
function appendUnique<T extends { id: number }>(prev: T[], next: T[]): T[] {
  const seen = new Set(prev.map((i) => i.id));
  return [...prev, ...next.filter((i) => !seen.has(i.id))];
}

export function HistoryList({
  me,
  filter,
  explicitPeriod,
  initialItems,
  initialCursor,
}: {
  me: Me;
  filter: WireFilter;
  explicitPeriod: boolean;
  initialItems: WireItem[];
  initialCursor: Cursor | null;
}) {
  const toast = useToast();
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [extended, setExtended] = useState(explicitPeriod);
  const [done, setDone] = useState(explicitPeriod && initialCursor === null);
  const [loading, setLoading] = useState(false);
  const collapsedAll = useSyncExternalStore(subscribeCollapsed, readCollapsed, () => false);
  const [overrides, setOverrides] = useState<Map<number, boolean>>(new Map());
  const [sheetItem, setSheetItem] = useState<WireItem | null>(null);
  const [memoItem, setMemoItem] = useState<WireItem | null>(null);
  const [confirmItem, setConfirmItem] = useState<WireItem | null>(null);
  const [withdrawing, startWithdraw] = useTransition();
  const sentinel = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (loading || done) return;
    setLoading(true);
    try {
      if (cursor) {
        const page = await loadHistoryPage(extended && !explicitPeriod ? { ...filter, from: undefined } : filter, cursor);
        setItems((prev) => appendUnique(prev, page.items));
        setCursor(page.nextCursor);
        if (!page.nextCursor && extended) setDone(true);
      } else if (!extended) {
        // recent month is exhausted: keep going into older records
        const last = items[items.length - 1];
        const page = await loadHistoryPage({ ...filter, from: undefined }, last ? { givenAt: last.givenAt, id: last.id } : null);
        setItems((prev) => appendUnique(prev, page.items));
        setCursor(page.nextCursor);
        setExtended(true);
        if (!page.nextCursor) setDone(true);
      } else {
        setDone(true);
      }
    } catch {
      toast.show({ message: "기록을 불러오지 못했어요. 다시 스크롤해 주세요" });
    } finally {
      setLoading(false);
    }
  }, [cursor, done, explicitPeriod, extended, filter, items, loading, toast]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || done) return;
    const observer = new IntersectionObserver((entries) => entries[0].isIntersecting && loadMore(), { rootMargin: "200px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore, done]);

  const memoOpen = (id: number) => overrides.get(id) ?? !collapsedAll;
  const toggleAll = () => {
    setOverrides(new Map());
    writeCollapsed(!collapsedAll);
  };
  const updateItem = (id: number, patch: Partial<WireItem>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const withdraw = (item: WireItem) =>
    startWithdraw(async () => {
      const result = await withdrawAction(item.id);
      setConfirmItem(null);
      if (!result.ok) return toast.show({ message: result.error });
      updateItem(item.id, { withdrawnBy: { id: me.id, name: me.name, empNo: "", avatarPath: null, deleted: false } });
      setSheetItem(null);
      toast.show({ message: "철회했어요" });
    });

  const other = confirmItem && (confirmItem.giver.id === me.id ? confirmItem.receiver : confirmItem.giver);
  const hasMemos = items.some((i) => i.myMemo);

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between py-1 md:pb-3">
        <button
          type="button"
          onClick={toggleAll}
          disabled={!hasMemos}
          className="flex items-center gap-1 text-[13px] font-medium disabled:text-sub"
        >
          {collapsedAll ? <ChevronsUpDown size={14} /> : <ChevronsDownUp size={14} />}
          {collapsedAll ? "메모 모두 펼치기" : "메모 모두 접기"}
        </button>
        <span className="md:hidden">
          <OnlyMeToggle variant="switch" />
        </span>
      </div>

      <div className="hidden rounded-lg bg-surface px-4 py-2.5 text-[13px] font-medium text-sub md:flex">
        <span className="w-[260px]">준 사람</span>
        <span className="w-[260px]">받은 사람</span>
        <span className="flex-1">일자</span>
        <span className="w-[180px]" />
      </div>

      {items.length === 0 && done ? (
        <p className="py-16 text-center text-sm text-sub">조건에 맞는 기록이 없어요</p>
      ) : (
        <ul>
          {items.map((item) => (
            <Row
              key={item.id}
              item={item}
              me={me}
              memoOpen={memoOpen(item.id)}
              onToggleMemo={() => setOverrides((prev) => new Map(prev).set(item.id, !memoOpen(item.id)))}
              onOpenSheet={() => setSheetItem(item)}
              onEditMemo={() => (window.matchMedia("(min-width: 768px)").matches ? setMemoItem(item) : setSheetItem(item))}
              onWithdraw={() => setConfirmItem(item)}
            />
          ))}
        </ul>
      )}

      <div ref={sentinel} className="flex items-center justify-center gap-2 py-6 text-[13px] text-sub">
        {done ? (
          items.length > 0 && "처음 기록까지 다 봤어요"
        ) : (
          <>
            <LoaderCircle size={16} className="animate-spin" />
            이전 기록 불러오는 중
          </>
        )}
      </div>

      <RecordSheet
        key={sheetItem?.id ?? "none"}
        item={sheetItem}
        me={me}
        onClose={() => setSheetItem(null)}
        onSaved={(id, memo) => updateItem(id, { myMemo: memo })}
        onWithdraw={(item) => setConfirmItem(item)}
      />
      {memoItem && (
        <DesktopMemoEditor item={memoItem} onClose={() => setMemoItem(null)} onSaved={(id, memo) => updateItem(id, { myMemo: memo })} />
      )}
      <ConfirmDialog
        open={!!confirmItem}
        title="이 기록을 철회할까요?"
        body={`잔액 계산에서 빠지고, ${other?.name ?? ""}님도 ${me.name}님이 철회한 걸 볼 수 있어요.`}
        confirmLabel="철회"
        pending={withdrawing}
        onCancel={() => setConfirmItem(null)}
        onConfirm={() => confirmItem && withdraw(confirmItem)}
      />
    </div>
  );
}
