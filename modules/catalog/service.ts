import type { Product, ProductColor, ProductImage } from '@prisma/client';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import { BADGE_LABELS, GENDER_LABELS, MATERIAL_LABELS, SHAPE_LABELS, formatClp } from './labels';
import { findProductBySlug, listProducts, listRelatedProducts } from './repository';
import type { CatalogFilters } from './schemas';

type ProductWithRelations = Product & { colors: ProductColor[]; images: ProductImage[] };

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
  colors: { name: string; hex: string }[];
  mainImageUrl: string | null;
  waInquiryHref: string;
}

export interface ProductDetailView extends CatalogProductView {
  description: string | null;
  sizes: string | null;
  frontImageUrl: string | null;
  sideImageUrl: string | null;
  waQuoteHref: string;
}

function imageUrl(product: ProductWithRelations, slot: 'MAIN' | 'FRONT' | 'SIDE'): string | null {
  return product.images.find((image) => image.slot === slot)?.url ?? null;
}

function toCatalogView(product: ProductWithRelations): CatalogProductView {
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
    colors: product.colors.map((color) => ({ name: color.name, hex: color.hex })),
    mainImageUrl: imageUrl(product, 'MAIN'),
    waInquiryHref: buildWhatsAppLink(
      `Hola, ¿tienen disponible el modelo ${product.name} (${product.code})?`
    ),
  };
}

function toDetailView(product: ProductWithRelations): ProductDetailView {
  return {
    ...toCatalogView(product),
    description: product.description,
    sizes: product.sizes,
    frontImageUrl: imageUrl(product, 'FRONT'),
    sideImageUrl: imageUrl(product, 'SIDE'),
    waQuoteHref: buildWhatsAppLink(
      `Hola Pepi Visión 360, me interesa el modelo ${product.name} (${product.code}). ¿Me pueden cotizar?`
    ),
  };
}

export async function getCatalog(filters: CatalogFilters): Promise<CatalogProductView[]> {
  const products = await listProducts(filters);
  return products.map(toCatalogView);
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
