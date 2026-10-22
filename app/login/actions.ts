"use server";

import { redirect } from "next/navigation";
import { clearFailures, lockedMinutes, recordFailure } from "@/lib/auth/login-throttle";
import { writeSession } from "@/lib/auth/session";
import { authenticate } from "@/lib/data/users";
import { getDb } from "@/lib/db/client";

export type LoginState = { error?: string; loginId?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const loginId = String(formData.get("loginId") ?? "");
  const password = String(formData.get("password") ?? "");

  const locked = lockedMinutes(loginId);
  if (locked > 0) return { error: `여러 번 틀려서 잠시 막아뒀어요. ${locked}분 뒤에 다시 해주세요`, loginId };

  const user = await authenticate(await getDb(), loginId, password);
  if (!user) {
    recordFailure(loginId);
    return { error: "계정이나 비밀번호가 맞지 않아요", loginId };
  }
  clearFailures(loginId);
  await writeSession(user.id);
  redirect(user.isAdmin ? "/admin" : "/");
}
