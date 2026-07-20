// Fase 14 (redesign-extensible-catalog-v2 — SEO y compatibilidad de
// rutas): único constructor de metadata/JSON-LD del catálogo público.
// Módulo puro server-safe — recibe exclusivamente datos ya resueltos por
// modules/catalog/service.ts (nunca consulta Prisma, nunca depende de
// React) — mismo patrón que modules/catalog/dynamic-filters.ts. La URL
// pública base viene de `env.NEXT_PUBLIC_APP_URL` (única fuente ya
// validada del dominio público del proyecto, la misma que
// `app/layout.tsx` usa para `metadataBase`) — nunca un `localhost`
// hardcodeado ni un dominio inventado.
import type { Metadata } from 'next';
import { env } from '@/lib/env';

const SITE_NAME = 'Pepi Visión 360';

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

const PUBLIC_BASE_URL = stripTrailingSlash(env.NEXT_PUBLIC_APP_URL);

/** URL absoluta hacia una ruta interna del sitio público — nunca relativa, para que canonical/og:url/JSON-LD sean siempre resolubles fuera del propio navegador. */
export function absoluteUrl(path: string): string {
  return `${PUBLIC_BASE_URL}/${path.replace(/^\/+/, '')}`;
}

export function buildCategoryPath(categorySlug: string): string {
  return `/catalogo/${categorySlug}`;
}

export function buildOfferingPath(categorySlug: string, offeringSlug: string): string {
  return `/catalogo/${categorySlug}/${offeringSlug}`;
}

export function buildCategoryCanonicalUrl(categorySlug: string): string {
  return absoluteUrl(buildCategoryPath(categorySlug));
}

export function buildOfferingCanonicalUrl(categorySlug: string, offeringSlug: string): string {
  return absoluteUrl(buildOfferingPath(categorySlug, offeringSlug));
}

function nonEmpty(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

// --- Categoría ---

export interface SeoCategoryInput {
  slug: string;
  name: string;
  shortDescription: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  imagePath: string | null;
}

/**
 * 1. `category.seoTitle` cuando el admin lo definió explícitamente.
 * 2. Si no, un fallback comercial que usa `category.name` — como las dos
 *    categorías canónicas ("Lentes ópticos"/"Lentes de sol") ya son
 *    nombres distintos, este fallback por sí solo ya distingue ambas sin
 *    lógica adicional por categoría.
 */
export function buildCategoryTitle(category: SeoCategoryInput): string {
  return nonEmpty(category.seoTitle) ?? `${category.name} | ${SITE_NAME}`;
}

export function buildCategoryDescription(category: SeoCategoryInput): string {
  return (
    nonEmpty(category.seoDescription) ??
    nonEmpty(category.shortDescription) ??
    `Explora nuestros modelos de ${category.name.toLowerCase()} en ${SITE_NAME}.`
  );
}

/**
 * `hasQueryParams`: cualquier query param presente en `/catalogo/[categorySlug]`
 * (filtros comunes, `attr_*`, `q`, `price`, `availableOnly`, orden,
 * paginación, o cualquier parámetro desconocido) — nunca se refleja en
 * title/description, el canonical siempre apunta a la URL limpia, y
 * `robots.index` pasa a `false` (pero `follow: true`, para que los enlaces
 * internos sigan rastreables). Ver design.md → "Fase 14" para la decisión
 * completa.
 */
export function buildCategoryMetadata(category: SeoCategoryInput, options: { hasQueryParams: boolean }): Metadata {
  const canonicalPath = buildCategoryPath(category.slug);
  const canonicalUrl = absoluteUrl(canonicalPath);
  const title = buildCategoryTitle(category);
  const description = buildCategoryDescription(category);

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    robots: { index: !options.hasQueryParams, follow: true },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: 'website',
      ...(category.imagePath ? { images: [{ url: category.imagePath }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(category.imagePath ? { images: [category.imagePath] } : {}),
    },
  };
}

// --- ProductOffering ---

export interface SeoOfferingInput {
  categorySlug: string;
  categoryName: string;
  offeringSlug: string;
  /** Ya resuelto como `offering.title ?? product.name` — ver modules/catalog/service.ts. */
  name: string;
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  priceLabel: string;
  coverImageUrl: string | null;
}

/**
 * 1. `offering.seoTitle` cuando el admin lo definió explícitamente —
 *    nunca sobrescrito.
 * 2. Si no, `"${offering.name} — ${categoryName} | Pepi Visión 360"` — el
 *    mismo Product publicado en las dos categorías produce dos títulos
 *    distintos porque `categoryName` difiere, sin depender de que el
 *    admin haya configurado nada (requisito 14.4/14.1).
 */
export function buildOfferingTitle(offering: SeoOfferingInput): string {
  return nonEmpty(offering.seoTitle) ?? `${offering.name} — ${offering.categoryName} | ${SITE_NAME}`;
}

export function buildOfferingDescription(offering: SeoOfferingInput): string {
  return (
    nonEmpty(offering.seoDescription) ??
    nonEmpty(offering.description) ??
    `${offering.name} — disponible en ${offering.categoryName}, ${offering.priceLabel.toLowerCase()}. Cotiza tus lentes con ${SITE_NAME}.`
  );
}

export function buildOfferingMetadata(offering: SeoOfferingInput): Metadata {
  const canonicalPath = buildOfferingPath(offering.categorySlug, offering.offeringSlug);
  const canonicalUrl = absoluteUrl(canonicalPath);
  const title = buildOfferingTitle(offering);
  const description = buildOfferingDescription(offering);

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: 'website',
      ...(offering.coverImageUrl ? { images: [{ url: offering.coverImageUrl }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(offering.coverImageUrl ? { images: [offering.coverImageUrl] } : {}),
    },
  };
}

// --- JSON-LD ---

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function buildCategoryBreadcrumb(category: { slug: string; name: string }): BreadcrumbItem[] {
  return [
    { name: 'Inicio', url: absoluteUrl('/') },
    { name: 'Catálogo', url: absoluteUrl('/catalogo') },
    { name: category.name, url: buildCategoryCanonicalUrl(category.slug) },
  ];
}

export function buildOfferingBreadcrumb(
  category: { slug: string; name: string },
  offering: { slug: string; name: string }
): BreadcrumbItem[] {
  return [
    ...buildCategoryBreadcrumb(category),
    { name: offering.name, url: buildOfferingCanonicalUrl(category.slug, offering.slug) },
  ];
}

export function toBreadcrumbListJsonLd(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export interface SeoItemListEntry {
  categorySlug: string;
  offeringSlug: string;
  name: string;
  imageUrl: string | null;
}

/**
 * Solo para la URL limpia de categoría (sin query params) — representa
 * exactamente las ofertas públicas efectivamente mostradas en esa
 * respuesta, en el mismo orden. Nunca se genera para una URL filtrada
 * (ver buildCategoryMetadata → robots.index).
 */
export function toItemListJsonLd(entries: SeoItemListEntry[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: entries.map((entry, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: buildOfferingCanonicalUrl(entry.categorySlug, entry.offeringSlug),
      name: entry.name,
      ...(entry.imageUrl ? { image: entry.imageUrl } : {}),
    })),
  };
}

export interface SeoOfferingProductInput {
  categorySlug: string;
  categoryName: string;
  offeringSlug: string;
  name: string;
  description: string | null;
  brandName: string | null;
  images: string[];
  /** Fuente exclusiva: `ProductOffering.priceFromClp` — nunca `Product.priceFromClp`. `null` omite el nodo `offers` completo (14.5), nunca un precio fabricado. */
  priceFromClp: number | null;
}

/**
 * Product/Offer JSON-LD (14.2/14.5). Cuando `priceFromClp` es `null`
 * (oferta "Cotizar", sin precio público) se omite el nodo `offers`
 * completo — un `Offer` sin `price`/`priceCurrency` válidos no aporta
 * valor estructurado real y arriesgaría un schema inconsistente; esta
 * decisión se documenta en design.md → "Fase 14". Nunca se emite
 * `availability`: ni `active` ni `visible` son una señal real de stock,
 * y ninguna spec autoriza esa equivalencia.
 */
export function toOfferingProductJsonLd(input: SeoOfferingProductInput) {
  const url = buildOfferingCanonicalUrl(input.categorySlug, input.offeringSlug);
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: input.name,
    ...(input.description ? { description: input.description } : {}),
    ...(input.brandName ? { brand: { '@type': 'Brand', name: input.brandName } } : {}),
    ...(input.images.length > 0 ? { image: input.images } : {}),
    category: input.categoryName,
    url,
    ...(input.priceFromClp !== null
      ? {
          offers: {
            '@type': 'Offer',
            url,
            priceCurrency: 'CLP',
            price: input.priceFromClp,
          },
        }
      : {}),
  };
}

/**
 * Serialización segura para `<script type="application/ld+json">`:
 * escapa `<`/`>`/`&` a sus secuencias Unicode para impedir que un valor
 * dinámico (nombre de producto, descripción) cierre prematuramente el
 * `<script>` o inyecte HTML — JSON.stringify por sí solo no escapa estos
 * caracteres. Nunca se concatena JSON manualmente ni se acepta contenido
 * crudo de query params.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}
