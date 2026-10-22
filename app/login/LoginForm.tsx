"use client";

import { Check } from "lucide-react";
import { useActionState, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/Button";
import { Field, inputClass } from "@/components/Field";
import { PasswordInput } from "@/components/PasswordInput";
import { login, type LoginState } from "./actions";

const SAVED_ID_KEY = "login.savedId";

function readSavedId(): string | null {
  try {
    return localStorage.getItem(SAVED_ID_KEY);
  } catch {
    return null;
  }
}

function writeSavedId(id: string | null) {
  try {
    if (id) localStorage.setItem(SAVED_ID_KEY, id);
    else localStorage.removeItem(SAVED_ID_KEY);
  } catch {
    // storage unavailable (private mode): nothing is remembered, login still works
  }
}

// the saved id only changes on submit, so there is nothing to subscribe to
const subscribeNoop = () => () => {};

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  const savedId = useSyncExternalStore(subscribeNoop, readSavedId, () => null);
  const [typedId, setTypedId] = useState<string | null>(null);
  const [rememberChoice, setRememberChoice] = useState<boolean | null>(null);
  const loginId = typedId ?? state.loginId ?? savedId ?? "";
  const remember = rememberChoice ?? savedId !== null;

  return (
    <form action={action} onSubmit={() => writeSavedId(remember ? loginId.trim() : null)} className="flex flex-1 flex-col md:flex-none">
      <div className="flex flex-col gap-4">
        <Field label="계정" htmlFor="loginId">
          <input
            id="loginId"
            name="loginId"
            type="text"
            inputMode="email"
            value={loginId}
            onChange={(e) => setTypedId(e.target.value)}
            placeholder="회사 이메일"
            autoComplete="username"
            autoCapitalize="off"
            required
            className={`${inputClass} font-num`}
          />
        </Field>
        <Field label="비밀번호" htmlFor="password" error={state.error}>
          <PasswordInput id="password" name="password" autoComplete="current-password" required aria-invalid={!!state.error} />
        </Field>
        <label className="flex cursor-pointer items-center gap-2 self-start text-sm font-semibold">
          <input type="checkbox" checked={remember} onChange={(e) => setRememberChoice(e.target.checked)} className="peer sr-only" />
          <span className="flex size-5 items-center justify-center rounded-md border border-line bg-bg peer-checked:border-red peer-checked:bg-red peer-focus-visible:outline-2 peer-focus-visible:outline-red">
            {remember && <Check size={14} className="text-white" />}
          </span>
          아이디 저장
        </label>
      </div>
      <div className="flex-1 md:hidden" />
      <Button type="submit" disabled={pending} className="mt-10 w-full">
        로그인
      </Button>
    </form>
  );
}
