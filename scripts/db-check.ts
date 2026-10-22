import { sql } from "drizzle-orm";
import { createPostgresDb } from "@/lib/db/client";
import { authenticate } from "@/lib/data/users";

async function rows<T>(query: Promise<unknown>): Promise<T[]> {
  return [...((await query) as Iterable<T>)];
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL이 비어 있어요 (.env.local)");

  console.log("1) 연결 + 마이그레이션 + 관리자 시드...");
  const db = await createPostgresDb(url);

  const tables = await rows<{ relname: string; relrowsecurity: boolean }>(
    db.execute(sql`
      select c.relname, c.relrowsecurity
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' and c.relname in ('users', 'transfers', 'memos')
      order by c.relname`),
  );
  console.log("2) 테이블 / RLS:", tables.map((t) => `${t.relname}(rls=${t.relrowsecurity})`).join(", "));

  const admin = await authenticate(db, "admin", "admin1234!");
  console.log("3) admin 로그인:", admin?.isAdmin ? "성공" : "실패");

  const [{ count }] = await rows<{ count: string }>(db.execute(sql`select count(*)::text as count from users`));
  console.log("4) users 행 수:", count);

  await (db as unknown as { $client: { end: () => Promise<void> } }).$client.end();
}

main().catch((error) => {
  console.error("실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
