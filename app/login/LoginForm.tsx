"use client";

import { useActionState } from "react";
import { Button } from "@/components/Button";
import { Field, inputClass } from "@/components/Field";
import { PasswordInput } from "@/components/PasswordInput";
import { login, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="flex flex-1 flex-col md:flex-none">
      <div className="flex flex-col gap-4">
        <Field label="사번" htmlFor="loginId">
          <input
            id="loginId"
            name="loginId"
            defaultValue={state.loginId}
            maxLength={12}
            autoComplete="username"
            autoCapitalize="off"
            required
            className={`${inputClass} font-num`}
          />
        </Field>
        <Field label="비밀번호" htmlFor="password" help="처음 비밀번호는 0000이에요" error={state.error}>
          <PasswordInput id="password" name="password" autoComplete="current-password" required aria-invalid={!!state.error} />
        </Field>
      </div>
      <div className="flex-1 md:hidden" />
      <Button type="submit" disabled={pending} className="mt-10 w-full">
        로그인
      </Button>
    </form>
  );
}
