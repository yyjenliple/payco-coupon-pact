"use server";

import { redirect } from "next/navigation";
import { authenticate } from "@/lib/data/users";
import { getDb } from "@/lib/db/client";
import { writeSession } from "@/lib/auth/session";

export type LoginState = { error?: string; loginId?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const loginId = String(formData.get("loginId") ?? "");
  const password = String(formData.get("password") ?? "");
  const user = await authenticate(await getDb(), loginId, password);
  if (!user) return { error: "사번이나 비밀번호가 맞지 않아요", loginId };
  await writeSession(user.id);
  redirect(user.isAdmin ? "/admin" : "/");
}
