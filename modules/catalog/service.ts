import type { Brand, Category, Product, ProductColor, ProductImage, ProductOffering } from '@prisma/client';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import { findActiveVisibleCategoryBySlug, listActiveVisibleCategories } from './category-repository';
import { listAttributesForCategory } from './category-attribute-repository';
import { BADGE_LABELS, GENDER_LABELS, MATERIAL_LABELS, SHAPE_LABELS, formatClp, offeringCtaLabel } from './labels';
import {
  findDefaultPublicOfferingForProductSlug,
  findPublicOfferingByCategoryAndSlug,
  listBrandsWithPublicOfferingsInCategory,
  listOtherPublicOfferingsForProduct,
  listPublicOfferingsForCategoryFiltered,
  listRelatedPublicOfferings,
} from './offering-repository';
import { selectFilterableAttributes, type FilterableAttributeDefinition, type ResolvedAttributeFilter } from './dynamic-filters';
import type { CatalogFilters } from './schemas';

type ProductWithRelations = Product & { colors: ProductColor[]; images: ProductImage[]; brand: Brand | null };
type OfferingWithProduct = ProductOffering & { product: ProductWithRelations };
type OfferingWithCategory = ProductOffering & { category: Category };
type CategorySummary = { slug: string; name: string };

export interface BrandFilterOption {
  id: string;
  name: string;
  slug: string;
  logoPath: string | null;
}

export interface CategoryPickerItem {
  slug: string;
  name: string;
  shortDescription: string | null;
  icon: string | null;
  imagePath: string | null;
}

export interface GalleryImageView {
  id: string;
  url: string;
  productColorId: string;
  colorName: string;
  colorHex: string;
  isCover: boolean;
  sortOrder: number;
}

export interface OfferingCardView {
  id: string;
  productId: string;
  categorySlug: string;
  categoryName: string;
  offeringSlug: string;
  name: string;
  code: string;
  genderLabel: string;
  shapeLabel: string;
  materialLabel: string;
  priceLabel: string;
  available: boolean;
  availabilityLabel: string;
  badgeLabel: string | null;
  colors: { id: string; name: string; hex: string }[];
  coverImageUrl: string | null;
  waInquiryHref: string;
  brandName: string | null;
  ctaLabel: string;
}

export interface OtherCategoryOfferingLink {
  categorySlug: string;
  categoryName: string;
  offeringSlug: string;
  ctaLabel: string;
}

export interface OfferingDetailView extends OfferingCardView {
  description: string | null;
  sizes: string | null;
  images: GalleryImageView[];
  waQuoteHref: string;
  otherCategoryOfferings: OtherCategoryOfferingLink[];
}

function buildGalleryImages(product: ProductWithRelations): GalleryImageView[] {
  const colorsById = new Map(product.colors.map((color) => [color.id, color]));
  // images arrive pre-ordered by sortOrder (offering-repository.ts), so
  // .map here preserves gallery order — no re-sort needed.
  return product.images.map((image) => {
    const color = colorsById.get(image.productColorId);
    return {
      id: image.id,
      url: image.url,
      productColorId: image.productColorId,
      colorName: color?.name ?? '',
      colorHex: color?.hex ?? '#cccccc',
      isCover: image.isCover,
      sortOrder: image.sortOrder,
    };
  });
}

function coverImageUrl(images: GalleryImageView[]): string | null {
  return images.find((image) => image.isCover)?.url ?? images[0]?.url ?? null;
}

function offeringPriceLabel(priceFromClp: number | null): string {
  return priceFromClp != null ? `Desde ${formatClp(priceFromClp)}` : 'Cotizar';
}

function toOfferingCardView(offering: OfferingWithProduct, category: CategorySummary): OfferingCardView {
  const { product } = offering;
  const images = buildGalleryImages(product);
  return {
    id: offering.id,
    productId: offering.productId,
    categorySlug: category.slug,
    categoryName: category.name,
    offeringSlug: offering.slug,
    name: offering.title ?? product.name,
    code: product.code,
    genderLabel: GENDER_LABELS[product.gender],
    shapeLabel: SHAPE_LABELS[product.shape],
    materialLabel: MATERIAL_LABELS[product.material],
    priceLabel: offeringPriceLabel(offering.priceFromClp),
    available: product.available,
    availabilityLabel: product.available ? 'Disponible' : 'Bajo pedido',
    badgeLabel: product.badge ? BADGE_LABELS[product.badge] : null,
    colors: product.colors.map((color) => ({ id: color.id, name: color.name, hex: color.hex })),
    coverImageUrl: coverImageUrl(images),
    waInquiryHref: buildWhatsAppLink(`Hola, ¿tienen disponible el modelo ${product.name} (${product.code})?`),
    brandName: product.brand?.name ?? null,
    ctaLabel: offeringCtaLabel(category.slug),
  };
}

function toOfferingDetailView(
  offering: OfferingWithProduct & OfferingWithCategory,
  otherCategoryOfferings: OtherCategoryOfferingLink[]
): OfferingDetailView {
  const { product } = offering;
  return {
    ...toOfferingCardView(offering, offering.category),
    description: offering.commercialDescription ?? product.description,
    sizes: product.sizes,
    images: buildGalleryImages(product),
    waQuoteHref: buildWhatsAppLink(
      `Hola Pepi Visión 360, me interesa el modelo ${product.name} (${product.code}). ¿Me pueden cotizar?`
    ),
    otherCategoryOfferings,
  };
}

/** Selector de categorías de `/catalogo` (5.2) — agregar una categoría nueva desde el admin no requiere tocar este componente ni ningún otro. */
export async function getCategoryPicker(): Promise<CategoryPickerItem[]> {
  const categories = await listActiveVisibleCategories();
  return categories.map((c) => ({
    slug: c.slug,
    name: c.name,
    shortDescription: c.shortDescription,
    icon: c.icon,
    imagePath: c.imagePath,
  }));
}

/** Resuelve solo la categoría (sin ofertas) para el hero/metadata de `/catalogo/[categorySlug]` — evita repetir el listado completo solo para el título. */
export async function getCategorySummary(categorySlug: string): Promise<CategoryPickerItem | null> {
  const category = await findActiveVisibleCategoryBySlug(categorySlug);
  if (!category) return null;

  return {
    slug: category.slug,
    name: category.name,
    shortDescription: category.shortDescription,
    icon: category.icon,
    imagePath: category.imagePath,
  };
}

/** Listado + filtros de `/catalogo/[categorySlug]` (5.2) — `null` si la categoría no existe, no está activa, o no es visible (404). */
export async function getCatalogForCategory(
  categorySlug: string,
  filters: CatalogFilters,
  dynamicFilters: ResolvedAttributeFilter[] = []
): Promise<{ category: CategoryPickerItem; offerings: OfferingCardView[] } | null> {
  const category = await findActiveVisibleCategoryBySlug(categorySlug);
  if (!category) return null;

  const offerings = await listPublicOfferingsForCategoryFiltered(category.id, filters, dynamicFilters);
  const categorySummary: CategorySummary = category;
  return {
    category: {
      slug: category.slug,
      name: category.name,
      shortDescription: category.shortDescription,
      icon: category.icon,
      imagePath: category.imagePath,
    },
    offerings: offerings.map((offering) => toOfferingCardView(offering, categorySummary)),
  };
}

/**
 * Fase 12 (filtros dinámicos): las definiciones de atributo activas y
 * filtrables de esta categoría — fuente única para construir tanto el
 * schema/parser de query params (dynamic-filters.ts) como los controles
 * de `CatalogFilters.tsx`. `[]` si la categoría no existe/no es pública,
 * nunca un error.
 */
export async function getCategoryFilterableAttributes(categorySlug: string): Promise<FilterableAttributeDefinition[]> {
  const category = await findActiveVisibleCategoryBySlug(categorySlug);
  if (!category) return [];

  const definitions = await listAttributesForCategory(category.id);
  return selectFilterableAttributes(definitions);
}

/** Opciones de marca para el filtro de `/catalogo/[categorySlug]` — solo marcas con al menos una oferta pública en esa categoría. */
export async function getCategoryBrandFilterOptions(categorySlug: string): Promise<BrandFilterOption[]> {
  const category = await findActiveVisibleCategoryBySlug(categorySlug);
  if (!category) return [];

  const brands = await listBrandsWithPublicOfferingsInCategory(category.id);
  return brands.map((b) => ({ id: b.id, name: b.name, slug: b.slug, logoPath: b.logoPath }));
}

/** Ficha de oferta `/catalogo/[categorySlug]/[offeringSlug]` (5.2) — `null` si no hay una oferta pública que calce (404). */
export async function getOfferingDetail(
  categorySlug: string,
  offeringSlug: string
): Promise<{ offering: OfferingDetailView; related: OfferingCardView[] } | null> {
  const offering = await findPublicOfferingByCategoryAndSlug(categorySlug, offeringSlug);
  if (!offering) return null;

  const [otherOfferings, related] = await Promise.all([
    listOtherPublicOfferingsForProduct(offering.productId, offering.id),
    listRelatedPublicOfferings(offering),
  ]);

  const otherCategoryOfferings: OtherCategoryOfferingLink[] = otherOfferings.map((other) => ({
    categorySlug: other.category.slug,
    categoryName: other.category.name,
    offeringSlug: other.slug,
    ctaLabel: offeringCtaLabel(other.category.slug),
  }));

  return {
    offering: toOfferingDetailView(offering, otherCategoryOfferings),
    related: related.map((r) => toOfferingCardView(r, offering.category)),
  };
}

/** Capa de compatibilidad (8.1): destino del redirect 308 desde `/catalogo/[slug]`, o `null` si debe seguir siendo 404. */
export function getLegacyRedirectTarget(productSlug: string) {
  return findDefaultPublicOfferingForProductSlug(productSlug);
}

export type OfferingPageResolution =
  | { kind: 'found'; offering: OfferingDetailView; related: OfferingCardView[] }
  | { kind: 'redirect'; categorySlug: string; offeringSlug: string }
  | { kind: 'not_found' };

/**
 * Resuelve `/catalogo/[categorySlug]/[offeringSlug]` con el fallback de 3
 * segmentos (8.7, gap identificado en la corrección de taxonomía): si
 * `categorySlug` no resuelve a una categoría activa/visible (p. ej. la
 * extinta "armazones" o "lentes-de-sol-opticos"), se intenta resolver
 * `offeringSlug` como un slug de producto legado — mismo mecanismo que
 * `/catalogo/[slug]` (getLegacyRedirectTarget) — y, si resuelve, se
 * redirige 308 a la ubicación nueva en vez de devolver 404. Deliberadamente
 * NO se intenta este fallback cuando `categorySlug` sí es una categoría
 * válida pero `offeringSlug` simplemente no existe en ella — evita que un
 * producto capture por error el slug de una categoría vigente con una
 * oferta que no le pertenece.
 */
export async function resolveOfferingPage(
  categorySlug: string,
  offeringSlug: string
): Promise<OfferingPageResolution> {
  const category = await getCategorySummary(categorySlug);
  if (!category) {
    const legacyTarget = await getLegacyRedirectTarget(offeringSlug);
    if (legacyTarget) return { kind: 'redirect', ...legacyTarget };
    return { kind: 'not_found' };
  }

  const result = await getOfferingDetail(categorySlug, offeringSlug);
  if (!result) return { kind: 'not_found' };
  return { kind: 'found', ...result };
}
