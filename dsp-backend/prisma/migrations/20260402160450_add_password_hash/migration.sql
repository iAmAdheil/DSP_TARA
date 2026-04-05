-- AlterTable: add password_hash with a temporary default for existing rows,
-- then drop the default so new rows must provide a value via the application.
ALTER TABLE "users" ADD COLUMN "password_hash" TEXT NOT NULL DEFAULT '';
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP DEFAULT;
