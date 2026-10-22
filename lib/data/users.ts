import { and, asc, eq, ilike, isNull, ne, or, sql } from "drizzle-orm";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import type { Db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import type { PersonRef } from "@/lib/domain/balance";
import { DomainError } from "@/lib/errors";
import { toId } from "@/lib/ids";

export const INITIAL_PASSWORD = "0000";
/** Compared against when the 사번 doesn't exist, so a miss costs as much as a wrong password. */
const DUMMY_HASH = "$2b$10$//FOTwoduJeEx52MKipQOelmvJEO/qKAwp4BzE3VG3tJ8d/utW3c.";
export const MIN_PASSWORD_LENGTH = 4;

export type Member = {
  id: number;
  name: string;
  empNo: string;
  avatarPath: string | null;
  passwordChanged: boolean;
};

const memberColumns = {
  id: users.id,
  name: users.name,
  empNo: users.empNo,
  avatarPath: users.avatarPath,
  passwordChanged: users.passwordChanged,
};

const activeMember = and(isNull(users.deletedAt), eq(users.isAdmin, false));

function cleanName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 20) throw new DomainError("INVALID", "이름은 1~20자로 입력해 주세요");
  return trimmed;
}

function cleanEmpNo(empNo: string): string {
  const trimmed = empNo.trim();
  if (!trimmed) throw new DomainError("INVALID", "사번을 입력해 주세요");
  return trimmed;
}

/** Two admins adding the same 사번 at once can both pass assertEmpNoFree; the partial unique index catches the loser. */
function isUniqueViolation(error: unknown): boolean {
  for (let e = error as { code?: string; cause?: unknown } | undefined; e; e = e.cause as typeof e) {
    if (e.code === "23505") return true;
  }
  return false;
}

async function writeOrConflict<T>(write: () => Promise<T>): Promise<T> {
  try {
    return await write();
  } catch (error) {
    if (isUniqueViolation(error)) throw new DomainError("CONFLICT", "이미 쓰고 있는 사번이에요");
    throw error;
  }
}

async function assertEmpNoFree(db: Db, empNo: string, exceptId?: number): Promise<void> {
  if (empNo.toLowerCase() === "admin") throw new DomainError("CONFLICT", "이미 쓰고 있는 사번이에요");
  const clash = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.empNo, empNo), isNull(users.deletedAt), exceptId ? ne(users.id, exceptId) : undefined));
  if (clash.length > 0) throw new DomainError("CONFLICT", "이미 쓰고 있는 사번이에요");
}

const escapeLike = (q: string) => q.replace(/[\\%_]/g, (c) => `\\${c}`);

function matches(q: string | undefined) {
  const term = q?.trim();
  if (!term) return undefined;
  const pattern = `%${escapeLike(term)}%`;
  return or(ilike(users.name, pattern), ilike(users.empNo, pattern));
}

export async function authenticate(
  db: Db,
  loginId: string,
  password: string,
): Promise<{ id: number; isAdmin: boolean } | null> {
  const [user] = await db
    .select({ id: users.id, isAdmin: users.isAdmin, passwordHash: users.passwordHash })
    .from(users)
    .where(and(eq(users.empNo, loginId.trim()), isNull(users.deletedAt)));
  if (!user) {
    await verifyPassword(password, DUMMY_HASH);
    return null;
  }
  if (!(await verifyPassword(password, user.passwordHash))) return null;
  return { id: user.id, isAdmin: user.isAdmin };
}

export async function listMembers(db: Db, q?: string): Promise<Member[]> {
  return db
    .select(memberColumns)
    .from(users)
    .where(and(activeMember, matches(q)))
    .orderBy(asc(users.name), asc(users.id));
}

export async function searchGiveTargets(db: Db, meId: number, q: string): Promise<Member[]> {
  return db
    .select(memberColumns)
    .from(users)
    .where(and(activeMember, ne(users.id, meId), matches(q)))
    .orderBy(asc(users.name), asc(users.id));
}

export async function allPeople(db: Db): Promise<Map<number, PersonRef>> {
  const rows = await db
    .select({ ...memberColumns, deletedAt: users.deletedAt })
    .from(users)
    .where(eq(users.isAdmin, false));
  return new Map(
    rows.map((r) => [r.id, { id: r.id, name: r.name, empNo: r.empNo, avatarPath: r.avatarPath, deleted: r.deletedAt !== null }]),
  );
}

export async function createMember(db: Db, input: { name: string; empNo: string }): Promise<number> {
  const name = cleanName(input.name);
  const empNo = cleanEmpNo(input.empNo);
  await assertEmpNoFree(db, empNo);
  const passwordHash = await hashPassword(INITIAL_PASSWORD);
  const [row] = await writeOrConflict(() =>
    db.insert(users).values({ name, empNo, passwordHash, passwordChanged: false }).returning({ id: users.id }),
  );
  return row.id;
}

async function getActiveMember(db: Db, id: number) {
  const [user] = await db.select().from(users).where(and(eq(users.id, toId(id)), isNull(users.deletedAt)));
  if (!user) throw new DomainError("NOT_FOUND", "회원을 찾을 수 없어요");
  return user;
}

export async function updateMember(db: Db, id: number, input: { name: string; empNo: string }): Promise<void> {
  const user = await getActiveMember(db, id);
  if (user.isAdmin) throw new DomainError("FORBIDDEN", "관리자 계정은 바꿀 수 없어요");
  const name = cleanName(input.name);
  const empNo = cleanEmpNo(input.empNo);
  await assertEmpNoFree(db, empNo, id);
  await writeOrConflict(() => db.update(users).set({ name, empNo }).where(eq(users.id, id)));
}

export async function deleteMember(db: Db, id: number): Promise<void> {
  const user = await getActiveMember(db, id);
  if (user.isAdmin) throw new DomainError("FORBIDDEN", "관리자 계정은 삭제할 수 없어요");
  await db.update(users).set({ deletedAt: sql`now()` }).where(eq(users.id, id));
}

export async function updateMyName(db: Db, userId: number, name: string): Promise<void> {
  await db.update(users).set({ name: cleanName(name) }).where(eq(users.id, userId));
}

export async function setMyAvatar(db: Db, userId: number, avatarPath: string): Promise<void> {
  await db.update(users).set({ avatarPath }).where(eq(users.id, userId));
}

export async function changeMyPassword(
  db: Db,
  userId: number,
  input: { current: string; next: string; confirm: string },
  now = new Date(),
): Promise<void> {
  const user = await getActiveMember(db, userId);
  if (!(await verifyPassword(input.current, user.passwordHash))) {
    throw new DomainError("INVALID", "현재 비밀번호가 맞지 않아요");
  }
  if (input.next.length < MIN_PASSWORD_LENGTH) throw new DomainError("INVALID", "4자 이상 입력해 주세요");
  if (input.next !== input.confirm) throw new DomainError("INVALID", "새 비밀번호와 달라요");
  await db
    .update(users)
    .set({ passwordHash: await hashPassword(input.next), passwordChanged: true, passwordChangedAt: now })
    .where(eq(users.id, userId));
}
