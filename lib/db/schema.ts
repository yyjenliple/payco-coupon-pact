import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    empNo: text("emp_no").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    isAdmin: boolean("is_admin").notNull().default(false),
    passwordChanged: boolean("password_changed").notNull().default(false),
    avatarPath: text("avatar_path"),
    deletedAt: ts("deleted_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_emp_no_active").on(t.empNo).where(sql`${t.deletedAt} is null`)],
);

export const transfers = pgTable(
  "transfers",
  {
    id: serial("id").primaryKey(),
    giverId: integer("giver_id").notNull().references(() => users.id),
    receiverId: integer("receiver_id").notNull().references(() => users.id),
    givenAt: ts("given_at").notNull(),
    createdBy: integer("created_by").notNull().references(() => users.id),
    withdrawnAt: ts("withdrawn_at"),
    withdrawnBy: integer("withdrawn_by").references(() => users.id),
    editedAt: ts("edited_at"),
    editedBy: integer("edited_by").references(() => users.id),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("transfers_given_at_id").on(t.givenAt.desc(), t.id.desc()),
    check("transfers_not_self", sql`${t.giverId} <> ${t.receiverId}`),
  ],
);

export const memos = pgTable(
  "memos",
  {
    id: serial("id").primaryKey(),
    transferId: integer("transfer_id")
      .notNull()
      .references(() => transfers.id, { onDelete: "cascade" }),
    userId: integer("user_id").notNull().references(() => users.id),
    body: text("body").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("memos_transfer_user").on(t.transferId, t.userId)],
);
