-- CreateEnum
CREATE TYPE "CategoryAttributeType" AS ENUM ('TEXT', 'NUMBER', 'BOOLEAN', 'SELECT', 'MULTI_SELECT', 'RANGE');

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "shortDescription" TEXT,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "icon" TEXT,
    "imagePath" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "capabilities" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_offerings" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT,
    "commercialDescription" TEXT,
    "priceFromClp" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "configuration" JSONB,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "product_offerings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_attribute_definitions" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "CategoryAttributeType" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "filterable" BOOLEAN NOT NULL DEFAULT false,
    "visibleInCard" BOOLEAN NOT NULL DEFAULT false,
    "visibleInDetail" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "options" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_attribute_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_offering_attribute_values" (
    "id" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "attributeDefinitionId" TEXT NOT NULL,
    "valueText" TEXT,
    "valueNumber" DOUBLE PRECISION,
    "valueBoolean" BOOLEAN,

    CONSTRAINT "product_offering_attribute_values_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "product_offerings_categoryId_visible_idx" ON "product_offerings"("categoryId", "visible");

-- CreateIndex
CREATE INDEX "product_offerings_productId_idx" ON "product_offerings"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "product_offerings_productId_categoryId_key" ON "product_offerings"("productId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "product_offerings_categoryId_slug_key" ON "product_offerings"("categoryId", "slug");

-- CreateIndex
CREATE INDEX "category_attribute_definitions_categoryId_filterable_idx" ON "category_attribute_definitions"("categoryId", "filterable");

-- CreateIndex
CREATE UNIQUE INDEX "category_attribute_definitions_categoryId_key_key" ON "category_attribute_definitions"("categoryId", "key");

-- CreateIndex
CREATE INDEX "poav_attribute_definition_id_value_text_idx" ON "product_offering_attribute_values"("attributeDefinitionId", "valueText");

-- CreateIndex
CREATE INDEX "poav_attribute_definition_id_value_number_idx" ON "product_offering_attribute_values"("attributeDefinitionId", "valueNumber");

-- CreateIndex
CREATE UNIQUE INDEX "product_offering_attribute_values_offeringId_attributeDefin_key" ON "product_offering_attribute_values"("offeringId", "attributeDefinitionId");

-- AddForeignKey
ALTER TABLE "product_offerings" ADD CONSTRAINT "product_offerings_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_offerings" ADD CONSTRAINT "product_offerings_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_attribute_definitions" ADD CONSTRAINT "category_attribute_definitions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_offering_attribute_values" ADD CONSTRAINT "product_offering_attribute_values_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "product_offerings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_offering_attribute_values" ADD CONSTRAINT "product_offering_attribute_values_attributeDefinitionId_fkey" FOREIGN KEY ("attributeDefinitionId") REFERENCES "category_attribute_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
