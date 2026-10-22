"use server";

import { refresh } from "next/cache";
import { requireMember, requireUser } from "@/lib/auth/current-user";
import { writeSession } from "@/lib/auth/session";
import { asResult, type ActionResult } from "@/lib/action-result";
import { deleteAvatar, saveAvatar, validateAvatar } from "@/lib/avatar-storage";
import { changeMyPassword, setMyAvatar, updateMyName } from "@/lib/data/users";
import { getDb } from "@/lib/db/client";

export async function updateNameAction(name: string): Promise<ActionResult> {
  const me = await requireMember();
  const result = await asResult(async () => {
    await updateMyName(await getDb(), me.id, name);
    return {};
  });
  refresh();
  return result;
}

export async function uploadAvatarAction(formData: FormData): Promise<ActionResult> {
  const me = await requireMember();
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "사진을 골라 주세요" };
  const invalid = validateAvatar(file);
  if (invalid) return { ok: false, error: invalid };
  const name = await saveAvatar(me.id, file);
  await setMyAvatar(await getDb(), me.id, name);
  await deleteAvatar(me.avatarPath);
  refresh();
  return { ok: true };
}

export async function changePasswordAction(input: { current: string; next: string; confirm: string }): Promise<ActionResult> {
  const me = await requireUser();
  return asResult(async () => {
    const now = new Date();
    await changeMyPassword(await getDb(), me.id, input, now);
    // other devices are signed out by the change; keep this one signed in
    await writeSession(me.id, now.getTime());
    return {};
  });
}
