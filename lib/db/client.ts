import { mkdirSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { and, eq, isNull } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import { migrate as migratePostgres } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { hashPassword } from "@/lib/auth/password";
import * as schema from "./schema";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

const MIGRATIONS = path.join(process.cwd(), "drizzle");
const ADMIN_ID = "admin";
const ADMIN_INITIAL_PASSWORD = "admin1234!";

export async function ensureAdmin(db: Db): Promise<void> {
  const existing = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(and(eq(schema.users.empNo, ADMIN_ID), isNull(schema.users.deletedAt)));
  if (existing.length > 0) return;
  await db.insert(schema.users).values({
    empNo: ADMIN_ID,
    name: "관리자",
    passwordHash: await hashPassword(ADMIN_INITIAL_PASSWORD),
    isAdmin: true,
    passwordChanged: false,
  });
}

/** In-memory when dataDir is omitted (tests); a folder path for local dev. */
export async function createPgliteDb(dataDir?: string): Promise<Db> {
  if (dataDir) mkdirSync(dataDir, { recursive: true });
  const client = dataDir ? new PGlite(dataDir) : new PGlite();
  const db = drizzlePglite({ client, schema });
  await migratePglite(db, { migrationsFolder: MIGRATIONS });
  await ensureAdmin(db as unknown as Db);
  return db as unknown as Db;
}

export async function createPostgresDb(url: string): Promise<Db> {
  const client = postgres(url, { prepare: false });
  const db = drizzlePostgres({ client, schema });
  await migratePostgres(db, { migrationsFolder: MIGRATIONS });
  await ensureAdmin(db as unknown as Db);
  return db as unknown as Db;
}

const globalForDb = globalThis as unknown as { couponDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  if (!globalForDb.couponDb) {
    const url = process.env.DATABASE_URL;
    globalForDb.couponDb = (
      url ? createPostgresDb(url) : createPgliteDb(path.join(process.cwd(), "data", "pglite"))
    ).catch((error: unknown) => {
      // don't keep a failed connection cached; the next request retries
      globalForDb.couponDb = undefined;
      throw error;
    });
  }
  return globalForDb.couponDb;
}
