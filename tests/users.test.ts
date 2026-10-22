import { beforeEach, describe, expect, test } from "vitest";
import { eq } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import {
  allPeople,
  authenticate,
  changeMyPassword,
  createMember,
  deleteMember,
  listMembers,
  searchGiveTargets,
  setMyAvatar,
  updateMember,
  updateMyName,
} from "@/lib/data/users";
import { makeTestDb } from "./helpers/db";

let db: Db;
beforeEach(async () => {
  db = await makeTestDb();
});

const adminId = async () => (await db.select().from(users).where(eq(users.empNo, "admin")))[0].id;

describe("authentication", () => {
  test("new member logs in with 0000 (trimmed id) and starts with passwordChanged=false", async () => {
    const id = await createMember(db, { name: "윤가람", empNo: "A-2026-01" });
    expect(await authenticate(db, " A-2026-01 ", "0000")).toEqual({ id, isAdmin: false });
    expect((await listMembers(db))[0].passwordChanged).toBe(false);
  });

  test("admin logs in with admin / admin1234!", async () => {
    expect((await authenticate(db, "admin", "admin1234!"))?.isAdmin).toBe(true);
  });

  test("wrong password returns null", async () => {
    await createMember(db, { name: "윤가람", empNo: "A1" });
    expect(await authenticate(db, "A1", "1111")).toBeNull();
    expect(await authenticate(db, "nobody", "0000")).toBeNull();
  });
});

describe("admin member management", () => {
  test("deleted member cannot log in, disappears from lists, stays in allPeople", async () => {
    const id = await createMember(db, { name: "박준호", empNo: "10412" });
    await deleteMember(db, id);
    expect(await authenticate(db, "10412", "0000")).toBeNull();
    expect(await listMembers(db)).toEqual([]);
    expect((await allPeople(db)).get(id)).toMatchObject({ name: "박준호", deleted: true });
  });

  test("emp no longer than 12 chars is accepted server-side", async () => {
    await expect(createMember(db, { name: "긴사번", empNo: "ABCDEFGHIJKLMNOP" })).resolves.toBeTypeOf("number");
  });

  test("emp no 'admin' (any case) and active duplicates are rejected", async () => {
    await createMember(db, { name: "김하늘", empNo: "10234" });
    await expect(createMember(db, { name: "x", empNo: "Admin" })).rejects.toMatchObject({ code: "CONFLICT", message: "이미 쓰고 있는 사번이에요" });
    await expect(createMember(db, { name: "x", empNo: "10234" })).rejects.toMatchObject({ code: "CONFLICT", message: "이미 쓰고 있는 사번이에요" });
  });

  test("updateMember rejects another member's emp no but keeps its own", async () => {
    const a = await createMember(db, { name: "김하늘", empNo: "10234" });
    await createMember(db, { name: "이서연", empNo: "10087" });
    await expect(updateMember(db, a, { name: "김하늘", empNo: "10087" })).rejects.toMatchObject({ code: "CONFLICT" });
    await updateMember(db, a, { name: "김하늘2", empNo: "10234" });
    expect((await listMembers(db)).find((m) => m.id === a)?.name).toBe("김하늘2");
  });

  test("name and emp no validation", async () => {
    await expect(createMember(db, { name: "  ", empNo: "1" })).rejects.toMatchObject({ code: "INVALID", message: "이름은 1~20자로 입력해 주세요" });
    await expect(createMember(db, { name: "가".repeat(21), empNo: "1" })).rejects.toMatchObject({ code: "INVALID" });
    await expect(createMember(db, { name: "김", empNo: "  " })).rejects.toMatchObject({ code: "INVALID", message: "사번을 입력해 주세요" });
  });

  test("admin account cannot be deleted", async () => {
    await expect(deleteMember(db, await adminId())).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  test("listMembers filters by name or emp no and excludes admin", async () => {
    await createMember(db, { name: "김하늘", empNo: "10234" });
    await createMember(db, { name: "이서연", empNo: "10087" });
    expect((await listMembers(db)).map((m) => m.name)).toEqual(["김하늘", "이서연"]);
    expect((await listMembers(db, "서연")).map((m) => m.name)).toEqual(["이서연"]);
    expect((await listMembers(db, "023")).map((m) => m.name)).toEqual(["김하늘"]);
  });
});

describe("my profile", () => {
  test("searchGiveTargets excludes me, admin and deleted, matches name or emp no", async () => {
    const me = await createMember(db, { name: "김하늘", empNo: "10234" });
    await createMember(db, { name: "김서연", empNo: "10087" });
    const gone = await createMember(db, { name: "김준호", empNo: "10412" });
    await deleteMember(db, gone);
    expect((await searchGiveTargets(db, me, "김")).map((m) => m.name)).toEqual(["김서연"]);
    expect((await searchGiveTargets(db, me, "")).map((m) => m.name)).toEqual(["김서연"]);
  });

  test("updateMyName validates and setMyAvatar stores the path", async () => {
    const me = await createMember(db, { name: "김하늘", empNo: "10234" });
    await expect(updateMyName(db, me, "")).rejects.toMatchObject({ code: "INVALID" });
    await updateMyName(db, me, " 하늘 ");
    await setMyAvatar(db, me, "1-123.png");
    expect((await allPeople(db)).get(me)).toMatchObject({ name: "하늘", avatarPath: "1-123.png" });
  });

  test("changeMyPassword validates in order and flips passwordChanged", async () => {
    const me = await createMember(db, { name: "김하늘", empNo: "10234" });
    await expect(changeMyPassword(db, me, { current: "9999", next: "abcd", confirm: "abcd" })).rejects.toMatchObject({ message: "현재 비밀번호가 맞지 않아요" });
    await expect(changeMyPassword(db, me, { current: "0000", next: "123", confirm: "123" })).rejects.toMatchObject({ message: "4자 이상 입력해 주세요" });
    await expect(changeMyPassword(db, me, { current: "0000", next: "abcd", confirm: "abce" })).rejects.toMatchObject({ message: "새 비밀번호와 달라요" });
    await changeMyPassword(db, me, { current: "0000", next: "abcd", confirm: "abcd" });
    expect(await authenticate(db, "10234", "abcd")).toEqual({ id: me, isAdmin: false });
    expect(await authenticate(db, "10234", "0000")).toBeNull();
    expect((await listMembers(db))[0].passwordChanged).toBe(true);
  });
});
