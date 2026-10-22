"use client";

import { EllipsisVertical, KeyRound, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Field, inputClass } from "@/components/Field";
import { Sheet } from "@/components/Sheet";
import { useToast } from "@/components/Toast";
import type { Member } from "@/lib/data/users";
import { createMemberAction, deleteMemberAction, updateMemberAction } from "../actions";

const EMP_NO_MAX = 12;

function MemberSheet({ member, open, onClose }: { member: Member | null; open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [name, setName] = useState(member?.name ?? "");
  const [empNo, setEmpNo] = useState(member?.empNo ?? "");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const editing = !!member;

  return (
    <Sheet open={open} onClose={onClose} title={editing ? "회원 수정" : "회원 추가"}>
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const input = { name, empNo };
            const result = editing ? await updateMemberAction(member.id, input) : await createMemberAction(input);
            if (!result.ok) return setError(result.error);
            onClose();
            toast.show({ message: editing ? "저장했어요" : `${name.trim()}님을 추가했어요` });
          });
        }}
      >
        <div className="flex flex-col gap-3.5">
          <Field label="이름" htmlFor="member-name">
            <input id="member-name" value={name} maxLength={20} autoFocus onChange={(e) => setName(e.target.value)} className={inputClass} />
          </Field>
          <Field label="사번" htmlFor="member-empno" error={error}>
            <input
              id="member-empno"
              value={empNo}
              maxLength={EMP_NO_MAX}
              placeholder="사번 입력"
              aria-invalid={!!error}
              onChange={(e) => {
                setEmpNo(e.target.value);
                setError(undefined);
              }}
              className={`${inputClass} font-num`}
            />
          </Field>
        </div>
        {!editing && (
          <p className="flex items-center gap-2 rounded-xl bg-surface px-3.5 py-3 text-[13px] text-sub">
            <KeyRound size={16} />
            처음 비밀번호는 0000으로 만들어져요
          </p>
        )}
        <Button type="submit" disabled={pending || !name.trim() || !empNo.trim()}>
          {editing ? "저장" : "추가"}
        </Button>
      </form>
    </Sheet>
  );
}

function InlineEditRow({ member, onDone }: { member: Member; onDone: () => void }) {
  const toast = useToast();
  const [name, setName] = useState(member.name);
  const [empNo, setEmpNo] = useState(member.empNo);
  const [pending, start] = useTransition();
  const input = "h-[38px] rounded-lg border border-ink bg-bg px-2.5 text-sm font-medium outline-none";
  return (
    <tr className="border-b border-line bg-red-soft">
      <td className="px-4 py-2.5">
        <span className="flex items-center gap-2.5">
          <Avatar person={member} size={32} />
          <input aria-label="이름" value={name} maxLength={20} onChange={(e) => setName(e.target.value)} className={`${input} w-[180px]`} />
        </span>
      </td>
      <td>
        <input aria-label="사번" value={empNo} maxLength={EMP_NO_MAX} onChange={(e) => setEmpNo(e.target.value)} className={`${input} w-[140px] font-num`} />
      </td>
      <td className="text-[13px] text-sub">{member.passwordChanged ? "변경함" : "초기 비밀번호"}</td>
      <td className="px-4 text-right">
        <span className="inline-flex items-center gap-1">
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const result = await updateMemberAction(member.id, { name, empNo });
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

export function MemberManager({ members, query }: { members: Member[]; query: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const [q, setQ] = useState(query);
  const [sheet, setSheet] = useState<{ member: Member | null } | null>(null);
  const [menuFor, setMenuFor] = useState<Member | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<Member | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (q.trim() === query) return;
    const id = setTimeout(() => router.replace(q.trim() ? `${pathname}?q=${encodeURIComponent(q.trim())}` : pathname), 300);
    return () => clearTimeout(id);
  }, [q, query, pathname, router]);

  const remove = (member: Member) =>
    start(async () => {
      const result = await deleteMemberAction(member.id);
      setDeleting(null);
      toast.show({ message: result.ok ? `${member.name}님을 삭제했어요` : result.error });
    });

  return (
    <main className="mx-auto flex max-w-[960px] flex-col gap-5 px-5 pb-10 pt-4 md:gap-6 md:px-0 md:pt-10">
      <div className="flex items-center justify-between gap-3">
        <h1 className="flex items-end gap-2.5">
          <span className="text-[22px] font-bold md:text-[28px]">회원 관리</span>
          <span className="hidden pb-1 text-[15px] text-sub md:inline">{members.length}명</span>
        </h1>
        <div className="flex items-center gap-2.5">
          <label className="hidden h-[42px] w-[260px] items-center gap-2 rounded-[10px] bg-surface px-3 md:flex">
            <Search size={16} className="text-sub" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름이나 사번" aria-label="이름이나 사번" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-sub" />
          </label>
          <Button size="md" onClick={() => setSheet({ member: null })} className="h-[38px] pl-2.5 md:h-[42px]">
            <Plus size={18} />
            회원 추가
          </Button>
        </div>
      </div>

      <label className="flex h-[46px] items-center gap-2.5 rounded-xl bg-surface px-3.5 md:hidden">
        <Search size={18} className="text-sub" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름이나 사번" aria-label="이름이나 사번" className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-sub" />
      </label>
      <p className="text-[13px] text-sub md:hidden">{members.length}명</p>

      {members.length === 0 ? (
        <p className="py-16 text-center text-sm text-sub">{query ? "찾는 회원이 없어요" : "아직 회원이 없어요. 회원을 추가해 주세요"}</p>
      ) : (
        <>
          <ul className="flex flex-col md:hidden">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 border-b border-line py-3">
                <Avatar person={m} size={40} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[15px] font-semibold">{m.name}</span>
                  <span className="font-num text-[13px] text-sub">{m.empNo}</span>
                </span>
                {!m.passwordChanged && <span className="rounded-[5px] bg-surface px-[7px] py-0.5 text-[11px] font-semibold text-sub">초기 비밀번호</span>}
                <button type="button" aria-label={`${m.name} 메뉴`} onClick={() => setMenuFor(m)} className="p-1 text-sub">
                  <EllipsisVertical size={18} />
                </button>
              </li>
            ))}
          </ul>

          <table className="hidden w-full text-left md:table">
            <thead>
              <tr className="bg-surface text-[13px] font-medium text-sub">
                <th className="w-[320px] rounded-l-lg px-4 py-2.5 font-medium">이름</th>
                <th className="w-[200px] font-medium">사번</th>
                <th className="w-[200px] font-medium">비밀번호</th>
                <th className="rounded-r-lg" />
              </tr>
            </thead>
            <tbody>
              {members.map((m) =>
                editingId === m.id ? (
                  <InlineEditRow key={m.id} member={m} onDone={() => setEditingId(null)} />
                ) : (
                  <tr key={m.id} className="border-b border-line">
                    <td className="px-4 py-3.5">
                      <span className="flex items-center gap-2.5">
                        <Avatar person={m} size={32} />
                        <span className="text-sm font-semibold">{m.name}</span>
                      </span>
                    </td>
                    <td className="font-num text-sm">{m.empNo}</td>
                    <td className="text-[13px] text-sub">{m.passwordChanged ? "변경함" : "초기 비밀번호"}</td>
                    <td className="px-4 text-right">
                      <span className="inline-flex gap-1">
                        <button type="button" onClick={() => setEditingId(m.id)} className="flex h-8 items-center gap-1 rounded-lg px-2.5 text-[13px] text-sub hover:bg-surface">
                          <Pencil size={14} />
                          수정
                        </button>
                        <button type="button" onClick={() => setDeleting(m)} className="flex h-8 items-center gap-1 rounded-lg px-2.5 text-[13px] text-red hover:bg-red-soft">
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

      {sheet && <MemberSheet key={sheet.member?.id ?? "new"} member={sheet.member} open onClose={() => setSheet(null)} />}

      <Sheet open={!!menuFor} onClose={() => setMenuFor(null)} title={menuFor?.name ?? ""}>
        <div className="flex flex-col">
          <button
            type="button"
            onClick={() => {
              setSheet({ member: menuFor });
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
        title={`${deleting?.name ?? ""}님을 삭제할까요?`}
        body="로그인은 더 이상 안 되고, 주고받은 기록은 그대로 남아요."
        confirmLabel="삭제"
        pending={pending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && remove(deleting)}
      />
    </main>
  );
}
