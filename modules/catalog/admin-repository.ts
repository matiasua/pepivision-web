import type { Gender, ProductBadge, ProductMaterial, ProductShape } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export function listProductsForAdmin(search?: string) {
  return prisma.product.findMany({
    where: search
      ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { code: { contains: search, mode: 'insensitive' } }] }
      : undefined,
    include: { colors: true, images: true },
    orderBy: { createdAt: 'desc' },
  });
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
  return prisma.product.findUnique({ where: { id }, include: { colors: true, images: true } });
}

export function findProductByCode(code: string) {
  return prisma.product.findUnique({ where: { code } });
}

/** Unlike modules/catalog/repository.ts's findProductBySlug, this ignores `visible` — used only for slug-uniqueness checks. */
export function findProductBySlugAny(slug: string) {
  return prisma.product.findUnique({ where: { slug }, select: { id: true } });
}

interface ProductRowInput {
  name: string;
  code: string;
  slug: string;
  priceFromClp: number;
  sizes: string | null;
  gender: Gender;
  shape: ProductShape;
  material: ProductMaterial;
  available: boolean;
  visible: boolean;
  badge: ProductBadge | null;
  description: string | null;
  colors: { name: string; hex: string }[];
  actorId: string;
}

export function createProductRow(input: ProductRowInput) {
  return prisma.product.create({
    data: {
      name: input.name,
      code: input.code,
      slug: input.slug,
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
      colors: { create: input.colors },
    },
  });
}

export async function updateProductRow(id: string, input: Omit<ProductRowInput, 'slug'>) {
  await prisma.productColor.deleteMany({ where: { productId: id } });
  return prisma.product.update({
    where: { id },
    data: {
      name: input.name,
      code: input.code,
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
      colors: { create: input.colors },
    },
  });
}

export function deleteProductRow(id: string) {
  return prisma.product.delete({ where: { id } });
}
