import type { Brand, Product, ProductColor, ProductImage } from '@prisma/client';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import { BADGE_LABELS, GENDER_LABELS, MATERIAL_LABELS, SHAPE_LABELS, formatClp } from './labels';
import { findProductBySlug, listBrandsWithPublishedProducts, listProducts, listRelatedProducts } from './repository';
import type { CatalogFilters } from './schemas';

type ProductWithRelations = Product & { colors: ProductColor[]; images: ProductImage[]; brand: Brand | null };

export interface BrandFilterOption {
  id: string;
  name: string;
  slug: string;
  logoPath: string | null;
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

export interface CatalogProductView {
  id: string;
  slug: string;
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
}

export interface ProductDetailView extends CatalogProductView {
  description: string | null;
  sizes: string | null;
  images: GalleryImageView[];
  waQuoteHref: string;
}

function buildGalleryImages(product: ProductWithRelations): GalleryImageView[] {
  const colorsById = new Map(product.colors.map((color) => [color.id, color]));
  // images arrive pre-ordered by sortOrder (repository.ts), so .map here
  // preserves gallery order — no re-sort needed.
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

function toCatalogView(product: ProductWithRelations): CatalogProductView {
  const images = buildGalleryImages(product);
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    code: product.code,
    genderLabel: GENDER_LABELS[product.gender],
    shapeLabel: SHAPE_LABELS[product.shape],
    materialLabel: MATERIAL_LABELS[product.material],
    priceLabel: `Desde ${formatClp(product.priceFromClp)}`,
    available: product.available,
    availabilityLabel: product.available ? 'Disponible' : 'Bajo pedido',
    badgeLabel: product.badge ? BADGE_LABELS[product.badge] : null,
    colors: product.colors.map((color) => ({ id: color.id, name: color.name, hex: color.hex })),
    coverImageUrl: coverImageUrl(images),
    waInquiryHref: buildWhatsAppLink(
      `Hola, ¿tienen disponible el modelo ${product.name} (${product.code})?`
    ),
    brandName: product.brand?.name ?? null,
  };
}

function toDetailView(product: ProductWithRelations): ProductDetailView {
  return {
    ...toCatalogView(product),
    description: product.description,
    sizes: product.sizes,
    images: buildGalleryImages(product),
    waQuoteHref: buildWhatsAppLink(
      `Hola Pepi Visión 360, me interesa el modelo ${product.name} (${product.code}). ¿Me pueden cotizar?`
    ),
  };
}

export async function getCatalog(filters: CatalogFilters): Promise<CatalogProductView[]> {
  const products = await listProducts(filters);
  return products.map(toCatalogView);
}

/** Brand filter options for /catalogo — only brands with at least one published product ever appear, per design.md. */
export async function getCatalogBrandFilterOptions(): Promise<BrandFilterOption[]> {
  const brands = await listBrandsWithPublishedProducts();
  return brands.map((b) => ({ id: b.id, name: b.name, slug: b.slug, logoPath: b.logoPath }));
}

export async function getProductBySlug(slug: string): Promise<{
  product: ProductDetailView;
  related: CatalogProductView[];
} | null> {
  const product = await findProductBySlug(slug);
  if (!product) return null;

  const related = await listRelatedProducts(product);
  return {
    product: toDetailView(product),
    related: related.map(toCatalogView),
  };
}
