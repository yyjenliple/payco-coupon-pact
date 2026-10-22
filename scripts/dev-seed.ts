/**
 * Local-only demo data. Refuses to run against DATABASE_URL so it never touches Supabase.
 * Usage: npm run dev:seed   (then start the app with an empty DATABASE_URL)
 */
import path from "node:path";
import { createPgliteDb } from "@/lib/db/client";
import { createMember } from "@/lib/data/users";
import { adminCreateTransfer, withdrawTransfer } from "@/lib/data/transfers";
import { saveMyMemo } from "@/lib/data/memos";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  if (process.env.DATABASE_URL) throw new Error("DATABASE_URL이 설정돼 있어요. 로컬 시드는 PGlite에만 넣어요.");
  const db = await createPgliteDb(path.join(process.cwd(), "data", "pglite"));
  const [admin] = await db.select().from(users).where(eq(users.empNo, "admin"));
  const existing = await db.select().from(users).where(eq(users.empNo, "10234"));
  if (existing.length) return console.log("이미 시드돼 있어요");

  const ids: Record<string, number> = {};
  for (const [key, name, empNo] of [
    ["hn", "김하늘", "10234"], ["sy", "이서연", "10087"], ["jh", "박준호", "10412"], ["mj", "최민지", "10533"],
    ["de", "정다은", "10198"], ["ji", "한지훈", "10377"], ["sr", "오세린", "A-10601"],
  ]) ids[key] = await createMember(db, { name, empNo });

  const at = (daysAgo: number) => new Date(Date.now() - daysAgo * 86400000);
  let d = 1;
  const give = async (g: string, r: string, n = 1) => {
    const out: number[] = [];
    for (let i = 0; i < n; i++) out.push(await adminCreateTransfer(db, admin.id, { giverId: ids[g], receiverId: ids[r], givenAt: at(d++ * 0.7) }));
    return out;
  };
  await give("sy", "mj", 2); await give("ji", "mj"); await give("hn", "mj");
  const [t] = await give("hn", "jh", 2); await give("sy", "jh");
  await give("de", "hn"); await give("de", "sr");
  await saveMyMemo(db, ids.hn, t, "회의 끝나고 국밥. 다음엔 준호가 산다고 함");
  const [w] = await give("hn", "ji");
  await withdrawTransfer(db, ids.hn, w);
  for (let i = 0; i < 40; i++) await give(i % 2 ? "sy" : "ji", i % 2 ? "ji" : "sy");
  console.log("시드 완료: 회원 7명, 비밀번호 0000");
}

main().catch((e) => { console.error(e); process.exit(1); });
