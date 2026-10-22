import { describe, expect, test } from "vitest";
import { avatarColorOf, formatKst, initialsOf, monthAgoKst } from "@/lib/format";

describe("format helpers", () => {
  test("formatKst renders Asia/Seoul YYYY-MM-DD HH:MM", () => {
    expect(formatKst(new Date("2026-10-22T03:31:00Z"))).toBe("2026-10-22 12:31");
    expect(formatKst(new Date("2026-10-21T15:05:00Z"))).toBe("2026-10-22 00:05");
  });

  test("initialsOf takes the last two characters", () => {
    expect(initialsOf("김하늘")).toBe("하늘");
    expect(initialsOf("민")).toBe("민");
  });

  test("monthAgoKst is midnight KST one month before", () => {
    expect(monthAgoKst(new Date("2026-10-22T03:00:00Z")).toISOString()).toBe("2026-09-21T15:00:00.000Z");
    expect(monthAgoKst(new Date("2026-03-31T03:00:00Z")).toISOString()).toBe("2026-02-27T15:00:00.000Z");
  });

  test("avatarColorOf cycles the pastel palette", () => {
    expect(avatarColorOf(0)).toBe("#FFE3D6");
    expect(avatarColorOf(8)).toBe(avatarColorOf(1));
  });
});
