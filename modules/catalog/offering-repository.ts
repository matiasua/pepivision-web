import { Prisma, type Gender, type ProductShape } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { CatalogFilters } from './schemas';
import type { ResolvedAttributeFilter } from './dynamic-filters';

const IMAGES_ORDERED = { orderBy: { sortOrder: 'asc' as const } };
const OFFERING_INCLUDE_PRODUCT = {
  product: { include: { colors: true, images: IMAGES_ORDERED, brand: true } },
} as const;

export function findOfferingById(id: string) {
  return prisma.productOffering.findUnique({ where: { id } });
}

/**
 * Fase 9 (motor de compatibilidades): el único dato de `Category`/
 * `Product` que la validación de dominio necesita — nunca la fila
 * completa. Incluye soft-deleted (`deletedAt`) a propósito: quien llama
 * decide qué hacer con una oferta borrada, en vez de que quede
 * indistinguible de "no existe".
 */
export function findOfferingWithLensContext(id: string) {
  return prisma.productOffering.findUnique({
    where: { id },
    select: {
      id: true,
      categoryId: true,
      productId: true,
      active: true,
      visible: true,
      deletedAt: true,
      configuration: true,
      category: { select: { id: true, slug: true, active: true, visible: true, capabilities: true } },
      product: { select: { id: true, visible: true } },
    },
  });
}

/**
 * Fase 10 (cotizador configurable): superconjunto de
 * `findOfferingWithLensContext` — agrega lo que el wizard necesita
 * mostrar/re-resolver (nombre/código de producto, marca, colores) sin
 * tocar la forma de esa función existente (evita romper sus llamadores de
 * la Fase 9).
 */
export function findOfferingWithWizardContext(id: string) {
  return prisma.productOffering.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      categoryId: true,
      productId: true,
      active: true,
      visible: true,
      deletedAt: true,
      configuration: true,
      priceFromClp: true,
      category: { select: { id: true, slug: true, name: true, active: true, visible: true, capabilities: true } },
      product: {
        select: {
          id: true,
          name: true,
          code: true,
          visible: true,
          brand: { select: { id: true, name: true, slug: true } },
          colors: { select: { id: true, name: true, hex: true } },
        },
      },
    },
  });
}

export function findOfferingByProductAndCategory(productId: string, categoryId: string) {
  return prisma.productOffering.findUnique({ where: { productId_categoryId: { productId, categoryId } } });
}

/** Solo para chequeos de unicidad de slug (acotado a la categoría) al crear una oferta. */
export function findOfferingBySlugInCategoryAny(categoryId: string, slug: string) {
  return prisma.productOffering.findUnique({ where: { categoryId_slug: { categoryId, slug } }, select: { id: true } });
}

/** Para la sección admin "Disponibilidad en el catálogo" de un producto (Fase 4) — incluye inactivas/invisibles, excluye soft-deleted. */
export function listOfferingsForProduct(productId: string) {
  return prisma.productOffering.findMany({
    where: { productId, deletedAt: null },
    include: { category: true },
    orderBy: { createdAt: 'asc' },
  });
}

/**
 * Lectura pública: respeta `category.active/visible`, `offering.active/
 * visible` y excluye soft-deleted — ver spec product-offerings → "Offering
 * active/visible state is independent per category" y "Offerings are
 * soft-deleted, never hard-deleted while referenced".
 */
export function listPublicOfferingsForCategory(categoryId: string) {
  return prisma.productOffering.findMany({
    where: {
      categoryId,
      active: true,
      visible: true,
      deletedAt: null,
      category: { active: true, visible: true },
    },
    include: OFFERING_INCLUDE_PRODUCT,
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
}

const PRICE_BUCKET_RANGES: Record<string, Prisma.IntFilter> = {
  low: { lt: 35000 },
  mid: { gte: 35000, lte: 42000 },
  high: { gt: 42000 },
};

/**
 * Fase 12 (filtros dinámicos): un filtro por atributo de categoría se
 * traduce en una condición `some` sobre `ProductOfferingAttributeValue`,
 * resuelta exclusivamente por `attributeDefinitionId` — nunca
 * interpolando la `key` cruda del query param en la ruta del campo Prisma
 * (ver dynamic-filters.ts y specs/dynamic-catalog-filters). Cada
 * dimensión distinta se combina con AND; los valores dentro de una misma
 * dimensión MULTI_SELECT se combinan con OR vía `{ in: [...] }`.
 */
function buildAttributeValueConditions(
  dynamicFilters: ResolvedAttributeFilter[]
): Prisma.ProductOfferingWhereInput['AND'] {
  if (dynamicFilters.length === 0) return undefined;
  return dynamicFilters.map((filter): Prisma.ProductOfferingWhereInput => {
    const valueWhere: Prisma.ProductOfferingAttributeValueWhereInput = { attributeDefinitionId: filter.attributeDefinitionId };
    if (filter.type === 'RANGE') {
      valueWhere.valueNumber = {
        ...(filter.rangeMin !== undefined ? { gte: filter.rangeMin } : {}),
        ...(filter.rangeMax !== undefined ? { lte: filter.rangeMax } : {}),
      };
      return { attributeValues: { some: valueWhere } };
    }
    if (filter.type === 'NUMBER') {
      valueWhere.valueNumber = filter.numberValue;
      return { attributeValues: { some: valueWhere } };
    }
    if (filter.type === 'BOOLEAN') {
      valueWhere.valueBoolean = filter.booleanValue;
      return { attributeValues: { some: valueWhere } };
    }
    if (filter.type === 'MULTI_SELECT') {
      // Fase 12 (cierre operativo — corrección real): MULTI_SELECT se
      // persiste como UN array JSON serializado en `valueText`
      // (@@unique([offeringId, attributeDefinitionId]) impide una fila
      // por valor seleccionado) — nunca como valores planos comparables
      // con `{ in: [...] }`. OR entre los valores elegidos se expresa
      // como `contains` del substring JSON-citado de cada uno
      // (`JSON.stringify(v)` ya entrega `"v"` con las comillas y el
      // escapado correctos, evitando falsos positivos de substring).
      return {
        attributeValues: {
          some: { attributeDefinitionId: filter.attributeDefinitionId, OR: filter.values!.map((v) => ({ valueText: { contains: JSON.stringify(v) } })) },
        },
      };
    }
    // SELECT / TEXT — valor plano, coincidencia exacta; OR entre los
    // valores seleccionados dentro de esta misma dimensión.
    valueWhere.valueText = { in: filter.values };
    return { attributeValues: { some: valueWhere } };
  });
}

/**
 * Filtros comunes (5.1) reusados tal cual desde modules/catalog/schemas.ts,
 * acotados a la categoría de la ruta, más los filtros dinámicos de la
 * Fase 12 (uno por `CategoryAttributeDefinition` filtrable de esa misma
 * categoría) — ambos grupos se combinan con AND.
 */
function buildPublicOfferingWhere(
  categoryId: string,
  filters: CatalogFilters,
  dynamicFilters: ResolvedAttributeFilter[] = []
): Prisma.ProductOfferingWhereInput {
  const productWhere: Prisma.ProductWhereInput = { visible: true };
  if (filters.gender) productWhere.gender = filters.gender;
  if (filters.shape) productWhere.shape = filters.shape;
  if (filters.material) productWhere.material = filters.material;
  if (filters.availableOnly) productWhere.available = true;
  if (filters.color) productWhere.colors = { some: { name: filters.color } };
  if (filters.brand) productWhere.brand = { slug: filters.brand, active: true };
  if (filters.q) {
    productWhere.OR = [
      { name: { contains: filters.q, mode: 'insensitive' } },
      { code: { contains: filters.q, mode: 'insensitive' } },
    ];
  }

  const where: Prisma.ProductOfferingWhereInput = {
    categoryId,
    active: true,
    visible: true,
    deletedAt: null,
    category: { active: true, visible: true },
    product: productWhere,
  };
  // El precio filtrable es el de la oferta (ProductOffering.priceFromClp),
  // nunca Product.priceFromClp — ver design.md → "Fase de compatibilidad de precios".
  if (filters.price) where.priceFromClp = PRICE_BUCKET_RANGES[filters.price];
  const attributeConditions = buildAttributeValueConditions(dynamicFilters);
  if (attributeConditions) where.AND = attributeConditions;
  return where;
}

export function listPublicOfferingsForCategoryFiltered(
  categoryId: string,
  filters: CatalogFilters,
  dynamicFilters: ResolvedAttributeFilter[] = []
) {
  return prisma.productOffering.findMany({
    where: buildPublicOfferingWhere(categoryId, filters, dynamicFilters),
    include: OFFERING_INCLUDE_PRODUCT,
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
}

/** Opciones de marca para el filtro de `/catalogo/[categorySlug]` — solo marcas con al menos una oferta pública en esa categoría. */
export function listBrandsWithPublicOfferingsInCategory(categoryId: string) {
  return prisma.brand.findMany({
    where: {
      active: true,
      products: {
        some: {
          visible: true,
          offerings: { some: { categoryId, active: true, visible: true, deletedAt: null } },
        },
      },
    },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
}

/** Para `/catalogo/[categorySlug]/[offeringSlug]` — `slug` es único por categoría, no global, ver ProductOffering.slug. */
export function findPublicOfferingByCategoryAndSlug(categorySlug: string, offeringSlug: string) {
  return prisma.productOffering.findFirst({
    where: {
      slug: offeringSlug,
      active: true,
      visible: true,
      deletedAt: null,
      category: { slug: categorySlug, active: true, visible: true },
      product: { visible: true },
    },
    include: { ...OFFERING_INCLUDE_PRODUCT, category: true },
  });
}

/** "También disponible como" (5.5) — otras ofertas públicas del mismo producto, en otras categorías. */
export function listOtherPublicOfferingsForProduct(productId: string, excludeOfferingId: string) {
  return prisma.productOffering.findMany({
    where: {
      productId,
      id: { not: excludeOfferingId },
      active: true,
      visible: true,
      deletedAt: null,
      category: { active: true, visible: true },
    },
    include: { category: true },
    orderBy: { category: { sortOrder: 'asc' } },
  });
}

/** "Productos relacionados" dentro de la misma categoría (mismo género o forma), para la ficha de oferta. */
export function listRelatedPublicOfferings(offering: {
  id: string;
  categoryId: string;
  product: { gender: Gender; shape: ProductShape };
}) {
  return prisma.productOffering.findMany({
    where: {
      id: { not: offering.id },
      categoryId: offering.categoryId,
      active: true,
      visible: true,
      deletedAt: null,
      category: { active: true, visible: true },
      product: {
        visible: true,
        OR: [{ gender: offering.product.gender }, { shape: offering.product.shape }],
      },
    },
    include: OFFERING_INCLUDE_PRODUCT,
    orderBy: { createdAt: 'asc' },
    take: 3,
  });
}

/**
 * Capa de compatibilidad (8.1, design.md → "Compatibilidad de URLs"):
 * resuelve la oferta "por defecto" de un producto por su slug legado, para
 * el redirect 308 desde `/catalogo/[slug]` (incluye `/catalogo/armazones/
 * [offeringSlug]`, tratado como slug de producto legado por la misma
 * ruta). Prioriza la oferta de la categoría "lentes-opticos" (si es
 * pública) — la categoría "armazones" ya no existe, así que un armazón sin
 * otra oferta ahora vive por defecto en Lentes ópticos tras la migración de
 * taxonomía; si no existe, la primera oferta pública por `sortOrder`. `null`
 * si el producto no existe, no es visible, o no tiene ninguna oferta
 * pública — mismo caso que hoy resulta en 404.
 */
export async function findDefaultPublicOfferingForProductSlug(
  productSlug: string
): Promise<{ categorySlug: string; offeringSlug: string } | null> {
  const product = await prisma.product.findFirst({ where: { slug: productSlug, visible: true }, select: { id: true } });
  if (!product) return null;

  const offerings = await prisma.productOffering.findMany({
    where: {
      productId: product.id,
      active: true,
      visible: true,
      deletedAt: null,
      category: { active: true, visible: true },
    },
    include: { category: { select: { slug: true } } },
    orderBy: { sortOrder: 'asc' },
  });
  if (offerings.length === 0) return null;

  const defaultOffering = offerings.find((o) => o.category.slug === 'lentes-opticos') ?? offerings[0];
  return { categorySlug: defaultOffering.category.slug, offeringSlug: defaultOffering.slug };
}

interface OfferingRowInput {
  title: string | null;
  commercialDescription: string | null;
  priceFromClp: number | null;
  active: boolean;
  visible: boolean;
  featured: boolean;
  sortOrder: number;
  seoTitle: string | null;
  seoDescription: string | null;
}

export function createOfferingRow(input: OfferingRowInput & { productId: string; categoryId: string; slug: string }) {
  return prisma.productOffering.create({ data: input });
}

/** `productId`/`categoryId`/`slug` deliberadamente fuera de este update — inmutables tras la creación. */
export function updateOfferingRow(id: string, input: OfferingRowInput) {
  return prisma.productOffering.update({ where: { id }, data: input });
}

export function softDeleteOfferingRow(id: string) {
  return prisma.productOffering.update({ where: { id }, data: { deletedAt: new Date() } });
}

export function setOfferingActiveRow(id: string, active: boolean) {
  return prisma.productOffering.update({ where: { id }, data: { active } });
}
