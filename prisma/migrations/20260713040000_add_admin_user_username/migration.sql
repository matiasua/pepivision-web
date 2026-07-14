-- Adds a required, unique, lowercase "username" login identifier to
-- AdminUser without touching any existing row's hash/role/sessions/audit
-- history. Done in three steps so existing rows are never left invalid
-- mid-migration:
--   1. add the column nullable (no rows are broken by its mere existence)
--   2. backfill every existing row from its email's local-part, resolving
--      collisions with a numeric suffix
--   3. only then enforce NOT NULL + UNIQUE, once every row already has a
--      valid, unique value

-- AlterTable
ALTER TABLE "admin_users" ADD COLUMN "username" TEXT;

-- Backfill existing rows. Allowed charset mirrors modules/auth/schemas.ts'
-- usernameSchema: lowercase a-z, 0-9, dot, underscore, hyphen.
DO $$
DECLARE
  rec RECORD;
  base_username TEXT;
  candidate TEXT;
  suffix INT;
BEGIN
  FOR rec IN SELECT id, email FROM "admin_users" ORDER BY "createdAt" ASC LOOP
    base_username := lower(regexp_replace(split_part(rec.email, '@', 1), '[^a-z0-9_.-]', '', 'g'));
    IF base_username = '' THEN
      base_username := 'user';
    END IF;

    candidate := base_username;
    suffix := 2;
    WHILE EXISTS (SELECT 1 FROM "admin_users" WHERE "username" = candidate) LOOP
      candidate := base_username || suffix::text;
      suffix := suffix + 1;
    END LOOP;

    UPDATE "admin_users" SET "username" = candidate WHERE id = rec.id;
  END LOOP;
END $$;

-- AlterTable
ALTER TABLE "admin_users" ALTER COLUMN "username" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_username_key" ON "admin_users"("username");
