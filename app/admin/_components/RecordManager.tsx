"use client";

import { ArrowRight, EllipsisVertical, LoaderCircle, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Field, inputClass } from "@/components/Field";
import { Sheet } from "@/components/Sheet";
import { useToast } from "@/components/Toast";
import type { Cursor } from "@/lib/data/transfers";
import type { PersonRef } from "@/lib/domain/balance";
import { formatKst, toKstLocal } from "@/lib/format";
import {
  createRecordAction,
  deleteRecordAction,
  loadAdminRecordsPage,
  updateRecordAction,
  type WireAdminFilter,
  type WireRecord,
} from "../actions";

type Option = { id: number; name: string; empNo: string; deleted: boolean };

function Tag({ children, tone }: { children: React.ReactNode; tone: "gray" | "amber" }) {
  return (
    <span className={`shrink-0 rounded-[5px] px-[7px] py-0.5 text-[11px] font-semibold md:text-xs ${tone === "gray" ? "bg-surface text-sub" : "bg-amber-soft text-amber"}`}>
      {children}
    </span>
  );
}

function Status({ record }: { record: WireRecord }) {
  if (record.withdrawnBy) return <Tag tone="gray">{record.withdrawnBy.name}님이 철회</Tag>;
  if (record.edited) return <Tag tone="amber">수정됨</Tag>;
  return <span className="text-[13px] text-sub">정상</span>;
}

function PersonSelect({ id, label, value, options, onChange, compact }: { id: string; label: string; value: number; options: Option[]; onChange: (v: number) => void; compact?: boolean }) {
  return (
    <select
      id={id}
      aria-label={label}
      value={value || ""}
      onChange={(e) => onChange(Number(e.target.value))}
      className={compact ? "h-[38px] w-[220px] rounded-lg border border-line bg-bg px-2.5 text-sm font-semibold" : inputClass}
    >
      <option value="" disabled>
        선택
      </option>
      {options
        .filter((o) => !o.deleted || o.id === value)
        .map((o) => (
          <option key={o.id} value={o.id}>
            {o.name} ({o.empNo}{o.deleted ? ", 삭제됨" : ""})
          </option>
        ))}
    </select>
  );
}

type Draft = { giverId: number; receiverId: number; givenAt: string };
const draftOf = (r: WireRecord | null): Draft =>
  r ? { giverId: r.giver.id, receiverId: r.receiver.id, givenAt: toKstLocal(new Date(r.givenAt)) } : { giverId: 0, receiverId: 0, givenAt: toKstLocal(new Date()) };

function RecordSheet({ record, options, onClose }: { record: WireRecord | null; options: Option[]; onClose: () => void }) {
  const toast = useToast();
  const [draft, setDraft] = useState(draftOf(record));
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const editing = !!record;
  return (
    <Sheet open onClose={onClose} title={editing ? "기록 수정" : "기록 추가"}>
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const result = editing ? await updateRecordAction(record.id, draft) : await createRecordAction(draft);
            if (!result.ok) return setError(result.error);
            onClose();
            toast.show({ message: editing ? "저장했어요" : "기록을 추가했어요" });
          });
        }}
      >
        <div className="flex flex-col gap-3.5">
          <Field label="준 사람" htmlFor="giver">
            <PersonSelect id="giver" label="준 사람" value={draft.giverId} options={options} onChange={(v) => setDraft((d) => ({ ...d, giverId: v }))} />
          </Field>
          <Field label="받은 사람" htmlFor="receiver">
            <PersonSelect id="receiver" label="받은 사람" value={draft.receiverId} options={options} onChange={(v) => setDraft((d) => ({ ...d, receiverId: v }))} />
          </Field>
          <Field label="일시" htmlFor="givenAt" error={error}>
            <input
              id="givenAt"
              type="datetime-local"
              value={draft.givenAt}
              max={toKstLocal(new Date())}
              onChange={(e) => {
                setDraft((d) => ({ ...d, givenAt: e.target.value }));
                setError(undefined);
              }}
              className={`${inputClass} font-num`}
            />
          </Field>
        </div>
        <Button type="submit" disabled={pending || !draft.giverId || !draft.receiverId || !draft.givenAt}>
          {editing ? "저장" : "추가"}
        </Button>
      </form>
    </Sheet>
  );
}

function PersonCell({ person }: { person: PersonRef }) {
  return (
    <span className="flex items-center gap-2.5">
      <Avatar person={person} size={28} />
      <span className="text-sm font-semibold">{person.name}</span>
      <span className="font-num text-xs text-sub">{person.empNo}</span>
    </span>
  );
}

function InlineEdit({ record, options, onDone }: { record: WireRecord; options: Option[]; onDone: () => void }) {
  const toast = useToast();
  const [draft, setDraft] = useState(draftOf(record));
  const [pending, start] = useTransition();
  return (
    <tr className="border-b border-line bg-red-soft">
      <td className="px-4 py-2.5">
        <PersonSelect id={`g${record.id}`} label="준 사람" compact value={draft.giverId} options={options} onChange={(v) => setDraft((d) => ({ ...d, giverId: v }))} />
      </td>
      <td>
        <PersonSelect id={`r${record.id}`} label="받은 사람" compact value={draft.receiverId} options={options} onChange={(v) => setDraft((d) => ({ ...d, receiverId: v }))} />
      </td>
      <td>
        <input
          type="datetime-local"
          aria-label="일시"
          value={draft.givenAt}
          max={toKstLocal(new Date())}
          onChange={(e) => setDraft((d) => ({ ...d, givenAt: e.target.value }))}
          className="h-[38px] w-[200px] rounded-lg border-[1.5px] border-red bg-bg px-2.5 font-num text-sm"
        />
      </td>
      <td>
        <Status record={record} />
      </td>
      <td className="px-4 text-right">
        <span className="inline-flex gap-1">
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const result = await updateRecordAction(record.id, draft);
                if (!result.ok) return toast.show({ message: result.error });
                onDone();
                toast.show({ message: "저장했어요" });
              })
            }
          >
            저장
          </Button>
          <Button size="sm" variant="ghost" onClick={onDone}>
            취소
          </Button>
        </span>
      </td>
    </tr>
  );
}

/** A page that arrives after a refresh may overlap rows we already show. */
function appendUnique<T extends { id: number }>(prev: T[], next: T[]): T[] {
  const seen = new Set(prev.map((i) => i.id));
  return [...prev, ...next.filter((i) => !seen.has(i.id))];
}

export function RecordManager({
  filter,
  explicitPeriod,
  initialItems,
  initialCursor,
  options,
  filters,
}: {
  filter: WireAdminFilter;
  explicitPeriod: boolean;
  initialItems: WireRecord[];
  initialCursor: Cursor | null;
  options: Option[];
  filters: React.ReactNode;
}) {
  const toast = useToast();
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [extended, setExtended] = useState(explicitPeriod);
  const [done, setDone] = useState(explicitPeriod && initialCursor === null);
  const [loading, setLoading] = useState(false);
  const [sheet, setSheet] = useState<{ record: WireRecord | null } | null>(null);
  const [menuFor, setMenuFor] = useState<WireRecord | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<WireRecord | null>(null);
  const [pending, start] = useTransition();
  const sentinel = useRef<HTMLDivElement>(null);

  // after a mutation the server re-renders with fresh first-page data; take it over
  const [seen, setSeen] = useState(initialItems);
  if (seen !== initialItems) {
    setSeen(initialItems);
    setItems(initialItems);
    setCursor(initialCursor);
    setExtended(explicitPeriod);
    setDone(explicitPeriod && initialCursor === null);
  }

  const loadMore = useCallback(async () => {
    if (loading || done) return;
    setLoading(true);
    try {
      const broaden = extended && !explicitPeriod;
      if (cursor) {
        const page = await loadAdminRecordsPage(broaden ? { ...filter, from: undefined } : filter, cursor);
        setItems((prev) => appendUnique(prev, page.items));
        setCursor(page.nextCursor);
        if (!page.nextCursor && extended) setDone(true);
      } else if (!extended) {
        const last = items[items.length - 1];
        const page = await loadAdminRecordsPage({ ...filter, from: undefined }, last ? { givenAt: last.givenAt, id: last.id } : null);
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

  const remove = (record: WireRecord) =>
    start(async () => {
      const result = await deleteRecordAction(record.id);
      setDeleting(null);
      if (!result.ok) return toast.show({ message: result.error });
      setItems((prev) => prev.filter((i) => i.id !== record.id));
      toast.show({ message: "기록을 삭제했어요" });
    });

  return (
    <main className="mx-auto flex max-w-[1040px] flex-col gap-5 px-5 pb-10 pt-4 md:gap-6 md:px-0 md:pt-10">
      <div className="flex items-center justify-between">
        <h1 className="flex items-end gap-2.5">
          <span className="text-[22px] font-bold md:text-[28px]">기록 관리</span>
        </h1>
        <Button size="md" onClick={() => setSheet({ record: null })} className="h-[38px] pl-2.5 md:h-[42px]">
          <Plus size={18} />
          기록 추가
        </Button>
      </div>

      {filters}

      {items.length === 0 && done ? (
        <p className="py-16 text-center text-sm text-sub">조건에 맞는 기록이 없어요</p>
      ) : (
        <>
          <ul className="flex flex-col md:hidden">
            {items.map((r) => {
              const withdrawn = !!r.withdrawnBy;
              const nameClass = `text-[15px] font-semibold ${withdrawn ? "text-sub line-through" : ""}`;
              return (
                <li key={r.id} className="flex items-center gap-2.5 border-b border-line py-3.5">
                  <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className={nameClass}>{r.giver.name}</span>
                      <ArrowRight size={14} className="text-sub" />
                      <span className={nameClass}>{r.receiver.name}</span>
                      {withdrawn && <Tag tone="gray">{r.withdrawnBy!.name}님이 철회</Tag>}
                      {r.edited && <Tag tone="amber">수정됨</Tag>}
                    </span>
                    <span className="font-num text-[13px] text-sub">{formatKst(new Date(r.givenAt))}</span>
                  </span>
                  <button type="button" aria-label="기록 메뉴" onClick={() => setMenuFor(r)} className="p-1 text-sub">
                    <EllipsisVertical size={18} />
                  </button>
                </li>
              );
            })}
          </ul>

          <table className="hidden w-full text-left md:table">
            <thead>
              <tr className="bg-surface text-[13px] text-sub">
                <th className="w-[250px] rounded-l-lg px-4 py-2.5 font-medium">준 사람</th>
                <th className="w-[250px] font-medium">받은 사람</th>
                <th className="w-[220px] font-medium">일자</th>
                <th className="font-medium">상태</th>
                <th className="w-[170px] rounded-r-lg" />
              </tr>
            </thead>
            <tbody>
              {items.map((r) =>
                editingId === r.id ? (
                  <InlineEdit key={r.id} record={r} options={options} onDone={() => setEditingId(null)} />
                ) : (
                  <tr key={r.id} className="border-b border-line">
                    <td className="px-4 py-3.5">
                      <PersonCell person={r.giver} />
                    </td>
                    <td>
                      <PersonCell person={r.receiver} />
                    </td>
                    <td className="font-num text-sm">{formatKst(new Date(r.givenAt))}</td>
                    <td>
                      <Status record={r} />
                    </td>
                    <td className="px-4 text-right">
                      <span className="inline-flex gap-1">
                        <button type="button" onClick={() => setEditingId(r.id)} className="flex h-8 items-center gap-1 whitespace-nowrap rounded-lg px-2 text-[13px] text-sub hover:bg-surface">
                          <Pencil size={14} />
                          수정
                        </button>
                        <button type="button" onClick={() => setDeleting(r)} className="flex h-8 items-center gap-1 whitespace-nowrap rounded-lg px-2 text-[13px] text-red hover:bg-red-soft">
                          <Trash2 size={14} />
                          삭제
                        </button>
                      </span>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </>
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

      {sheet && <RecordSheet key={sheet.record?.id ?? "new"} record={sheet.record} options={options} onClose={() => setSheet(null)} />}

      <Sheet open={!!menuFor} onClose={() => setMenuFor(null)} title="기록">
        <div className="flex flex-col">
          <button
            type="button"
            onClick={() => {
              setSheet({ record: menuFor });
              setMenuFor(null);
            }}
            className="flex items-center gap-3 py-3.5 text-[15px] font-medium"
          >
            <Pencil size={18} /> 수정
          </button>
          <button
            type="button"
            onClick={() => {
              setDeleting(menuFor);
              setMenuFor(null);
            }}
            className="flex items-center gap-3 py-3.5 text-[15px] font-medium text-red"
          >
            <Trash2 size={18} /> 삭제
          </button>
        </div>
      </Sheet>

      <ConfirmDialog
        open={!!deleting}
        title="이 기록을 삭제할까요?"
        body="잔액에서 빠지고 되돌릴 수 없어요."
        confirmLabel="삭제"
        pending={pending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && remove(deleting)}
      />
    </main>
  );
}
