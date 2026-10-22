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

const adminId = async () => (await db.select().from(users).where(eq(users.account, "admin")))[0].id;

describe("authentication", () => {
  test("new member logs in with 0000 by email (trimmed, any case) and starts with passwordChanged=false", async () => {
    const id = await createMember(db, { name: "윤가람", account: "Garam.Yoon@Corp.com" });
    expect(await authenticate(db, " garam.yoon@CORP.com ", "0000")).toEqual({ id, isAdmin: false });
    expect((await listMembers(db))[0]).toMatchObject({ account: "garam.yoon@corp.com", empNo: null, passwordChanged: false });
  });

  test("admin logs in with admin / admin1234!", async () => {
    expect((await authenticate(db, "admin", "admin1234!"))?.isAdmin).toBe(true);
    expect((await authenticate(db, "ADMIN", "admin1234!"))?.isAdmin).toBe(true);
  });

  test("wrong password returns null", async () => {
    await createMember(db, { name: "윤가람", account: "a1@corp.com" });
    expect(await authenticate(db, "a1@corp.com", "1111")).toBeNull();
    expect(await authenticate(db, "nobody@corp.com", "0000")).toBeNull();
  });

  test("emp no is not a login id", async () => {
    await createMember(db, { name: "윤가람", account: "a1@corp.com", empNo: "A-2026-01" });
    expect(await authenticate(db, "A-2026-01", "0000")).toBeNull();
  });
});

describe("admin member management", () => {
  test("deleted member cannot log in, disappears from lists, stays in allPeople; email is reusable", async () => {
    const id = await createMember(db, { name: "박준호", account: "junho@corp.com" });
    await deleteMember(db, id);
    expect(await authenticate(db, "junho@corp.com", "0000")).toBeNull();
    expect(await listMembers(db)).toEqual([]);
    expect((await allPeople(db)).get(id)).toMatchObject({ name: "박준호", account: "junho@corp.com", deleted: true });
    await expect(createMember(db, { name: "박준호", account: "junho@corp.com" })).resolves.toBeTypeOf("number");
  });

  test("emp no is optional, trimmed, blank becomes null, and may repeat", async () => {
    const a = await createMember(db, { name: "김하늘", account: "a@corp.com", empNo: " ABCDEFGHIJKLMNOP " });
    const b = await createMember(db, { name: "이서연", account: "b@corp.com", empNo: "   " });
    await createMember(db, { name: "박준호", account: "c@corp.com", empNo: "ABCDEFGHIJKLMNOP" });
    const byId = new Map((await listMembers(db)).map((m) => [m.id, m]));
    expect(byId.get(a)?.empNo).toBe("ABCDEFGHIJKLMNOP");
    expect(byId.get(b)?.empNo).toBeNull();
  });

  test("account 'admin' and active duplicate emails (any case) are rejected", async () => {
    await createMember(db, { name: "김하늘", account: "haneul@corp.com" });
    await expect(createMember(db, { name: "x", account: "Admin" })).rejects.toMatchObject({ code: "INVALID" });
    await expect(createMember(db, { name: "x", account: "HANEUL@corp.com" })).rejects.toMatchObject({ code: "CONFLICT", message: "이미 쓰고 있는 계정이에요" });
  });

  test("updateMember rejects another member's email but keeps its own, and edits emp no", async () => {
    const a = await createMember(db, { name: "김하늘", account: "haneul@corp.com" });
    await createMember(db, { name: "이서연", account: "seoyeon@corp.com" });
    await expect(updateMember(db, a, { name: "김하늘", account: "seoyeon@corp.com" })).rejects.toMatchObject({ code: "CONFLICT" });
    await updateMember(db, a, { name: "김하늘2", account: "haneul@corp.com", empNo: "10234" });
    expect((await listMembers(db)).find((m) => m.id === a)).toMatchObject({ name: "김하늘2", empNo: "10234" });
    await updateMember(db, a, { name: "김하늘2", account: "sky@corp.com", empNo: "" });
    expect((await listMembers(db)).find((m) => m.id === a)).toMatchObject({ account: "sky@corp.com", empNo: null });
  });

  test("name and email validation", async () => {
    await expect(createMember(db, { name: "  ", account: "a@corp.com" })).rejects.toMatchObject({ code: "INVALID", message: "이름은 1~20자로 입력해 주세요" });
    await expect(createMember(db, { name: "가".repeat(21), account: "a@corp.com" })).rejects.toMatchObject({ code: "INVALID" });
    await expect(createMember(db, { name: "김", account: "  " })).rejects.toMatchObject({ code: "INVALID", message: "이메일을 입력해 주세요" });
    for (const bad of ["haneul", "haneul@corp", "ha neul@corp.com", "@corp.com"]) {
      await expect(createMember(db, { name: "김", account: bad })).rejects.toMatchObject({ code: "INVALID", message: "이메일 형식으로 입력해 주세요" });
    }
  });

  test("admin account cannot be deleted", async () => {
    await expect(deleteMember(db, await adminId())).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  test("listMembers filters by name, email or emp no and excludes admin", async () => {
    await createMember(db, { name: "김하늘", account: "haneul@corp.com", empNo: "10234" });
    await createMember(db, { name: "이서연", account: "seoyeon@corp.com" });
    expect((await listMembers(db)).map((m) => m.name)).toEqual(["김하늘", "이서연"]);
    expect((await listMembers(db, "서연")).map((m) => m.name)).toEqual(["이서연"]);
    expect((await listMembers(db, "seoy")).map((m) => m.name)).toEqual(["이서연"]);
    expect((await listMembers(db, "023")).map((m) => m.name)).toEqual(["김하늘"]);
  });
});

describe("my profile", () => {
  test("searchGiveTargets excludes me, admin and deleted, matches name or email", async () => {
    const me = await createMember(db, { name: "김하늘", account: "haneul@corp.com" });
    await createMember(db, { name: "김서연", account: "seoyeon@corp.com" });
    const gone = await createMember(db, { name: "김준호", account: "junho@corp.com" });
    await deleteMember(db, gone);
    expect((await searchGiveTargets(db, me, "김")).map((m) => m.name)).toEqual(["김서연"]);
    expect((await searchGiveTargets(db, me, "")).map((m) => m.name)).toEqual(["김서연"]);
    expect((await searchGiveTargets(db, me, "seo")).map((m) => m.name)).toEqual(["김서연"]);
  });

  test("updateMyName validates and setMyAvatar stores the path", async () => {
    const me = await createMember(db, { name: "김하늘", account: "haneul@corp.com" });
    await expect(updateMyName(db, me, "")).rejects.toMatchObject({ code: "INVALID" });
    await updateMyName(db, me, " 하늘 ");
    await setMyAvatar(db, me, "1-123.png");
    expect((await allPeople(db)).get(me)).toMatchObject({ name: "하늘", avatarPath: "1-123.png" });
  });

  test("changeMyPassword validates in order and flips passwordChanged", async () => {
    const me = await createMember(db, { name: "김하늘", account: "haneul@corp.com" });
    await expect(changeMyPassword(db, me, { current: "9999", next: "abcd", confirm: "abcd" })).rejects.toMatchObject({ message: "현재 비밀번호가 맞지 않아요" });
    await expect(changeMyPassword(db, me, { current: "0000", next: "123", confirm: "123" })).rejects.toMatchObject({ message: "4자 이상 입력해 주세요" });
    await expect(changeMyPassword(db, me, { current: "0000", next: "abcd", confirm: "abce" })).rejects.toMatchObject({ message: "새 비밀번호와 달라요" });
    await changeMyPassword(db, me, { current: "0000", next: "abcd", confirm: "abcd" });
    expect(await authenticate(db, "haneul@corp.com", "abcd")).toEqual({ id: me, isAdmin: false });
    expect(await authenticate(db, "haneul@corp.com", "0000")).toBeNull();
    expect((await listMembers(db))[0].passwordChanged).toBe(true);
  });
});
