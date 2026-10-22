"use client";

import { Camera, ChevronRight, KeyRound, Lock } from "lucide-react";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { logout } from "@/app/actions/common";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { Field, inputClass } from "@/components/Field";
import { useToast } from "@/components/Toast";
import { updateNameAction, uploadAvatarAction } from "./actions";

type Me = { id: number; name: string; empNo: string; avatarPath: string | null };

export function ProfileForm({ me }: { me: Me }) {
  const toast = useToast();
  const [name, setName] = useState(me.name);
  const [error, setError] = useState<string>();
  const [saving, startSave] = useTransition();
  const [uploading, startUpload] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);

  const upload = (file: File) =>
    startUpload(async () => {
      const data = new FormData();
      data.set("avatar", file);
      const result = await uploadAvatarAction(data);
      toast.show({ message: result.ok ? "사진을 바꿨어요" : result.error });
    });

  return (
    <div className="flex flex-1 flex-col gap-7 md:gap-8">
      <div className="flex flex-col items-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={uploading}
          aria-label="사진 변경"
          className="relative disabled:opacity-60"
        >
          <Avatar person={me} size={104} />
          <span className="absolute bottom-0 right-0 flex size-[34px] items-center justify-center rounded-full bg-ink text-white ring-[3px] ring-bg">
            <Camera size={16} />
          </span>
        </button>
        <button type="button" onClick={() => fileInput.current?.click()} disabled={uploading} className="text-sm font-semibold text-red">
          {uploading ? "올리는 중" : "사진 변경"}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) upload(file);
          }}
        />
      </div>

      <div className="flex flex-col gap-4">
        <Field label="이름" htmlFor="name" error={error}>
          <input
            id="name"
            value={name}
            maxLength={20}
            onChange={(e) => {
              setName(e.target.value);
              setError(undefined);
            }}
            aria-invalid={!!error}
            className={inputClass}
          />
        </Field>
        <Field label="사번 (로그인 아이디)" htmlFor="empNo">
          <div className="relative">
            <input id="empNo" value={me.empNo} readOnly className={`${inputClass} font-num`} />
            <Lock size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sub" />
          </div>
        </Field>
        <Link href="/account/password" className="flex h-[52px] items-center justify-between border-y border-line px-1">
          <span className="flex items-center gap-2.5 text-[15px] font-medium">
            <KeyRound size={18} />
            비밀번호 변경
          </span>
          <ChevronRight size={18} className="text-sub" />
        </Link>
      </div>

      <div className="flex-1" />
      <div className="flex flex-col items-center gap-4 pb-4">
        <Button
          className="w-full"
          disabled={saving || name.trim() === me.name}
          onClick={() =>
            startSave(async () => {
              const result = await updateNameAction(name);
              if (!result.ok) return setError(result.error);
              toast.show({ message: "저장했어요" });
            })
          }
        >
          저장
        </Button>
        <form action={logout}>
          <button type="submit" className="text-[13px] text-sub underline underline-offset-2">
            로그아웃
          </button>
        </form>
      </div>
    </div>
  );
}
