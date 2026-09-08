-- Rename the password column to make it explicit that it stores a bcrypt hash
ALTER TABLE "users" RENAME COLUMN "password" TO "password_hash";

-- Optional profile / preference fields
ALTER TABLE "users" ADD COLUMN "avatar_url" TEXT;
ALTER TABLE "users" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'UAH';
