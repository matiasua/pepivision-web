-- Replaces the fixed 3-slot image model (MAIN/FRONT/SIDE) with a variable,
-- ordered photo gallery where every photo belongs to one of the product's
-- colors. Done in ordered steps so no existing row (product, color, or
-- image) is ever dropped or left invalid mid-migration:
--   1. add new columns nullable / with safe defaults
--   2. backfill a color for products that have photos but zero colors yet
--      (a clearly-named placeholder — nothing is deleted, admin can rename
--      or reassign later)
--   3. backfill every existing photo's color (its product's first color,
--      by id) and a consecutive sortOrder per product (by createdAt)
--   4. mark the first photo of each product as its cover
--   5. only now enforce NOT NULL + the composite FK + the "one cover per
--      product" constraint, once every row already satisfies them
--   6. drop the old slot column/enum, which nothing depends on anymore

-- AlterTable: composite unique needed so ProductImage can FK against
-- (id, productId) together — this is what makes "a photo can't reference a
-- color from a different product" a database-enforced invariant.
CREATE UNIQUE INDEX "product_colors_id_productId_key" ON "product_colors"("id", "productId");

-- AlterTable
ALTER TABLE "product_images"
  ADD COLUMN "productColorId" TEXT,
  ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "isCover" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "altText" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Products that already have photos but no color defined at all: create a
-- clearly-named placeholder color so every photo can get a valid, non-null
-- productColorId without deleting anything. Admins can rename it or
-- reassign the photos to a real color afterward from the panel.
INSERT INTO "product_colors" ("id", "productId", "name", "hex")
SELECT 'clr_' || substr(md5(random()::text || clock_timestamp()::text || p.id), 1, 20), p.id, 'Sin color asignado', '#9aa3b8'
FROM "products" p
WHERE EXISTS (SELECT 1 FROM "product_images" pi WHERE pi."productId" = p.id)
  AND NOT EXISTS (SELECT 1 FROM "product_colors" pc WHERE pc."productId" = p.id);

-- Backfill: every existing photo is assigned to its product's first color
-- (lowest id, deterministic). This can't be decided "correctly" from
-- existing data (a MAIN/FRONT/SIDE slot never encoded a color), so this is
-- the explicit, safe default — nothing is deleted, and the admin can
-- reassign each photo's color from the gallery UI afterward.
WITH first_color AS (
  SELECT DISTINCT ON ("productId") "productId", "id" AS "colorId"
  FROM "product_colors"
  ORDER BY "productId", "id" ASC
)
UPDATE "product_images" pi
SET "productColorId" = fc."colorId"
FROM first_color fc
WHERE fc."productId" = pi."productId";

-- Backfill: consecutive sortOrder per product, ordered by original upload
-- time (createdAt), and the earliest photo of each product becomes cover.
WITH ordered AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "productId" ORDER BY "createdAt" ASC) - 1 AS rn
  FROM "product_images"
)
UPDATE "product_images" pi
SET "sortOrder" = ordered.rn,
    "isCover" = (ordered.rn = 0)
FROM ordered
WHERE ordered."id" = pi."id";

-- AlterTable: every row now has a valid productColorId — safe to enforce.
ALTER TABLE "product_images" ALTER COLUMN "productColorId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "product_images_productColorId_productId_idx" ON "product_images"("productColorId", "productId");

-- CreateIndex
CREATE INDEX "product_images_productId_sortOrder_idx" ON "product_images"("productId", "sortOrder");

-- CreateIndex: at most one cover photo per product.
CREATE UNIQUE INDEX "product_images_one_cover_per_product" ON "product_images"("productId") WHERE "isCover" = true;

-- AddForeignKey: composite FK guarantees a photo's color always belongs to
-- the same product the photo itself belongs to.
ALTER TABLE "product_images"
  ADD CONSTRAINT "product_images_productColorId_productId_fkey"
  FOREIGN KEY ("productColorId", "productId") REFERENCES "product_colors"("id", "productId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: the slot model is fully replaced now — drop it.
ALTER TABLE "product_images" DROP COLUMN "slot";

-- DropEnum
DROP TYPE "ImageSlot";
