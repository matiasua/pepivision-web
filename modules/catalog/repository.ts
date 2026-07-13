import { Prisma, type Gender, type ProductShape } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { CatalogFilters } from './schemas';

const PRICE_BUCKET_RANGES: Record<string, Prisma.IntFilter> = {
  low: { lt: 35000 },
  mid: { gte: 35000, lte: 42000 },
  high: { gt: 42000 },
};

function buildWhere(filters: CatalogFilters): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {};

  if (filters.gender) where.gender = filters.gender;
  if (filters.shape) where.shape = filters.shape;
  if (filters.material) where.material = filters.material;
  if (filters.availableOnly) where.available = true;
  if (filters.price) where.priceFromClp = PRICE_BUCKET_RANGES[filters.price];
  if (filters.color) where.colors = { some: { name: filters.color } };
  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q, mode: 'insensitive' } },
      { code: { contains: filters.q, mode: 'insensitive' } },
    ];
  }

  return where;
}

export function listProducts(filters: CatalogFilters) {
  return prisma.product.findMany({
    where: buildWhere(filters),
    include: { colors: true, images: true },
    orderBy: { createdAt: 'asc' },
  });
}

export function findProductBySlug(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: { colors: true, images: true },
  });
}

export function listRelatedProducts(product: { id: string; gender: Gender; shape: ProductShape }) {
  return prisma.product.findMany({
    where: {
      id: { not: product.id },
      OR: [{ gender: product.gender }, { shape: product.shape }],
    },
    include: { colors: true, images: true },
    orderBy: { createdAt: 'asc' },
    take: 3,
  });
}
