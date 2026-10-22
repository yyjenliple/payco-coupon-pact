"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { changePasswordAction } from "@/app/(member)/me/actions";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { PasswordInput } from "@/components/PasswordInput";
import { useToast } from "@/components/Toast";

type Errors = Partial<Record<"current" | "next" | "confirm", string>>;

/** Maps the domain error message to the field it belongs to. */
function fieldOf(message: string): keyof Errors {
  if (message.startsWith("현재")) return "current";
  if (message.startsWith("4자")) return "next";
  return "confirm";
}

export function PasswordForm({ backHref }: { backHref: string }) {
  const router = useRouter();
  const toast = useToast();
  const [values, setValues] = useState({ current: "", next: "", confirm: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [pending, start] = useTransition();

  const field = (key: keyof Errors, label: string, help?: string, autoComplete = "new-password") => (
    <Field label={label} htmlFor={key} help={help} error={errors[key]}>
      <PasswordInput
        id={key}
        value={values[key]}
        autoComplete={autoComplete}
        aria-invalid={!!errors[key]}
        onChange={(e) => {
          setValues((v) => ({ ...v, [key]: e.target.value }));
          setErrors({});
        }}
      />
    </Field>
  );

  return (
    <form
      className="flex flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const result = await changePasswordAction(values);
          if (!result.ok) return setErrors({ [fieldOf(result.error)]: result.error });
          toast.show({ message: "비밀번호를 바꿨어요" });
          router.push(backHref);
        });
      }}
    >
      <div className="flex flex-col gap-5">
        {field("current", "현재 비밀번호", undefined, "current-password")}
        {field("next", "새 비밀번호", "4자 이상")}
        {field("confirm", "새 비밀번호 확인")}
      </div>
      <div className="min-h-10 flex-1" />
      <Button type="submit" disabled={pending || !values.current || !values.next || !values.confirm} className="w-full">
        비밀번호 변경
      </Button>
    </form>
  );
}
