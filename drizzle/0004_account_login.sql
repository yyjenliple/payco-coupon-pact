DROP INDEX "users_emp_no_active";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "emp_no" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "account" text;--> statement-breakpoint
-- existing rows keep logging in with their old id until an admin gives them an email
UPDATE "users" SET "account" = lower("emp_no");--> statement-breakpoint
UPDATE "users" SET "emp_no" = NULL WHERE "is_admin";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "account" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "users_account_active" ON "users" USING btree ("account") WHERE "users"."deleted_at" is null;
