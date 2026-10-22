import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { readSession } from "./session";

export type CurrentUser = {
  id: number;
  name: string;
  empNo: string;
  isAdmin: boolean;
  avatarPath: string | null;
  passwordChanged: boolean;
};

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const { userId } = await readSession();
  if (!userId) return null;
  const db = await getDb();
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      empNo: users.empNo,
      isAdmin: users.isAdmin,
      avatarPath: users.avatarPath,
      passwordChanged: users.passwordChanged,
    })
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.deletedAt)));
  return user ?? null;
});

/** Signed-in, non-admin member. Admins are sent to /admin. */
export async function requireMember(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.isAdmin) redirect("/admin");
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.isAdmin) redirect("/");
  return user;
}

/** Any signed-in account (used by the password page, which admins share). */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
