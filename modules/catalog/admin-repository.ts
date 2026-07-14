import type { Gender, Prisma, ProductBadge, ProductMaterial, ProductShape } from '@prisma/client';
import { prisma } from '@/lib/prisma';

const IMAGES_ORDERED = { orderBy: { sortOrder: 'asc' as const } };

export function listProductsForAdmin(search?: string) {
  return prisma.product.findMany({
    where: search
      ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { code: { contains: search, mode: 'insensitive' } }] }
      : undefined,
    include: { colors: true, images: IMAGES_ORDERED, brand: true },
    orderBy: { createdAt: 'desc' },
  });
}

/** For the admin product form's brand selector — only active brands can be assigned to a product. */
export function listActiveBrandsForAdmin() {
  return prisma.brand.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
}

export function findBrandById(id: string) {
  return prisma.brand.findUnique({ where: { id } });
}

export async function getProductKpis() {
  const [total, available, unavailable] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { available: true } }),
    prisma.product.count({ where: { available: false } }),
  ]);
  return { total, available, unavailable };
}

export function findProductById(id: string) {
  return prisma.product.findUnique({ where: { id }, include: { colors: true, images: IMAGES_ORDERED, brand: true } });
}

export function findProductByCode(code: string) {
  return prisma.product.findUnique({ where: { code } });
}

/** Unlike modules/catalog/repository.ts's findProductBySlug, this ignores `visible` — used only for slug-uniqueness checks. */
export function findProductBySlugAny(slug: string) {
  return prisma.product.findUnique({ where: { slug }, select: { id: true } });
}

interface ProductColorInput {
  id?: string;
  name: string;
  hex: string;
}

interface ProductRowInput {
  name: string;
  code: string;
  slug: string;
  brandId: string;
  priceFromClp: number;
  sizes: string | null;
  gender: Gender;
  shape: ProductShape;
  material: ProductMaterial;
  available: boolean;
  visible: boolean;
  badge: ProductBadge | null;
  description: string | null;
  colors: ProductColorInput[];
  actorId: string;
}

export function createProductRow(input: ProductRowInput) {
  return prisma.product.create({
    data: {
      name: input.name,
      code: input.code,
      slug: input.slug,
      brandId: input.brandId,
      priceFromClp: input.priceFromClp,
      sizes: input.sizes,
      gender: input.gender,
      shape: input.shape,
      material: input.material,
      available: input.available,
      visible: input.visible,
      badge: input.badge,
      description: input.description,
      createdById: input.actorId,
      updatedById: input.actorId,
      // A brand-new product can't have any pre-existing color ids yet —
      // strip any (a client shouldn't send one, but never trust it) and
      // create every color fresh.
      colors: { create: input.colors.map((c) => ({ name: c.name, hex: c.hex })) },
    },
  });
}

/**
 * Colors are stable entities once a ProductImage can reference one (see
 * migration 20260714000000_product_image_gallery), and are mutated
 * immediately/independently via addProductColorRow/removeProductColorRow
 * below (see modules/catalog/admin-service.ts) — this no longer touches
 * colors at all, only the product's own fields.
 */
export function updateProductRow(id: string, input: Omit<ProductRowInput, 'slug' | 'colors'>) {
  return prisma.product.update({
    where: { id },
    data: {
      name: input.name,
      code: input.code,
      brandId: input.brandId,
      priceFromClp: input.priceFromClp,
      sizes: input.sizes,
      gender: input.gender,
      shape: input.shape,
      material: input.material,
      available: input.available,
      visible: input.visible,
      badge: input.badge,
      description: input.description,
      updatedById: input.actorId,
    },
    include: { colors: true, images: IMAGES_ORDERED, brand: true },
  });
}

export function deleteProductRow(id: string) {
  return prisma.product.delete({ where: { id } });
}

export function findProductColorsByProductId(productId: string) {
  return prisma.productColor.findMany({ where: { productId }, orderBy: { id: 'asc' } });
}

export function findProductColorById(id: string) {
  return prisma.productColor.findUnique({ where: { id } });
}

/** Colors still referenced by at least one photo — used to block a color's removal/product-edit diff from orphaning images. */
export function findProductColorIdsInUse(colorIds: string[]) {
  return prisma.productImage
    .findMany({ where: { productColorId: { in: colorIds } }, select: { productColorId: true }, distinct: ['productColorId'] })
    .then((rows) => new Set(rows.map((r) => r.productColorId)));
}

export function createProductColorRow(data: { productId: string; name: string; hex: string }) {
  return prisma.productColor.create({ data });
}

export function deleteProductColorRow(id: string) {
  return prisma.productColor.delete({ where: { id } });
}

export function countProductImagesByColorId(colorId: string) {
  return prisma.productImage.count({ where: { productColorId: colorId } });
}

/** Moves every photo off `fromColorId` onto `toColorId`, then deletes the now-empty color — one transaction, so it's never left half-done. */
export function reassignAndDeleteColor(productId: string, fromColorId: string, toColorId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.productImage.updateMany({ where: { productId, productColorId: fromColorId }, data: { productColorId: toColorId } });
    await tx.productColor.delete({ where: { id: fromColorId } });
  });
}

export function listProductImages(productId: string) {
  return prisma.productImage.findMany({ where: { productId }, orderBy: { sortOrder: 'asc' } });
}

export function countProductImages(productId: string) {
  return prisma.productImage.count({ where: { productId } });
}

export function findProductImageById(id: string) {
  return prisma.productImage.findUnique({ where: { id } });
}

export function getMaxSortOrder(productId: string) {
  return prisma.productImage
    .aggregate({ where: { productId }, _max: { sortOrder: true } })
    .then((r) => r._max.sortOrder ?? -1);
}

export function createProductImageRow(data: {
  productId: string;
  productColorId: string;
  storageKey: string;
  url: string;
  width: number;
  height: number;
  sortOrder: number;
  isCover: boolean;
}) {
  return prisma.productImage.create({ data });
}

// Unchecked (not the default Checked variant): ProductImage's compound FK
// on (productColorId, productId) makes Prisma hide productColorId as a
// plain scalar in the Checked update type — Unchecked exposes the raw FK
// columns directly, which is what changeProductImageColor() needs.
export function updateProductImageRow(id: string, data: Prisma.ProductImageUncheckedUpdateInput) {
  return prisma.productImage.update({ where: { id }, data });
}

export function deleteProductImageRow(id: string) {
  return prisma.productImage.delete({ where: { id } });
}

/** Unsets the current cover (if any) and sets a new one — always sequential within one transaction, never both true at once (the partial unique index would reject that). */
export function setCoverImageRows(tx: Prisma.TransactionClient, productId: string, newCoverImageId: string) {
  return tx.productImage
    .updateMany({ where: { productId, isCover: true }, data: { isCover: false } })
    .then(() => tx.productImage.update({ where: { id: newCoverImageId }, data: { isCover: true } }));
}

export function reorderProductImagesRows(tx: Prisma.TransactionClient, orderedIds: string[]) {
  return Promise.all(orderedIds.map((imageId, index) => tx.productImage.update({ where: { id: imageId }, data: { sortOrder: index } })));
}

export function runInTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>) {
  return prisma.$transaction(fn);
}
