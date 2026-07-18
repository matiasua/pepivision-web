// Fase 10 (redesign-extensible-catalog-v2 — cotizador configurable): capa
// de composición entre el catálogo (Category/ProductOffering) y el motor
// de compatibilidades de la Fase 9, pensada para lo que el wizard
// necesita mostrar. No reimplementa ninguna regla de compatibilidad —
// delega siempre a modules/catalog/quote-options.ts.
import { listActiveVisibleCategories } from '@/modules/catalog/category-repository';
import { findOfferingWithWizardContext, listPublicOfferingsForCategory } from '@/modules/catalog/offering-repository';
import { parseCategoryCapabilities, type CategoryCapabilities } from '@/modules/catalog/category-capabilities';
import { isReservedLegacyCategorySlug } from '@/modules/catalog/legacy-slugs';
import { formatClp } from '@/modules/catalog/labels';
import { getEffectiveOfferingLensOptions, resolveCategoryQuoteOptions, type QuoteOptions } from '@/modules/catalog/quote-options';

export interface QuoteCategoryOption {
  id: string;
  slug: string;
  name: string;
  capabilities: CategoryCapabilities;
  quoteOptions: QuoteOptions;
}

/** Categorías activas/visibles para el paso "categoría" del wizard — nunca hardcodeadas en JSX. */
export async function listQuoteCategories(): Promise<QuoteCategoryOption[]> {
  const categories = await listActiveVisibleCategories();
  return categories.map((category) => {
    const capabilities = parseCategoryCapabilities(category.capabilities);
    return {
      id: category.id,
      slug: category.slug,
      name: category.name,
      capabilities,
      quoteOptions: resolveCategoryQuoteOptions(capabilities.quoteOptions),
    };
  });
}

export interface QuoteOfferingContext {
  offeringId: string;
  category: QuoteCategoryOption;
  product: {
    id: string;
    name: string;
    code: string;
    colors: { id: string; name: string; hex: string }[];
  };
  brand: { id: string; name: string; slug: string } | null;
  /** Intersección categoría ∩ `configuration.lensOptionExclusions` de esta oferta puntual — nunca amplía la de la categoría. */
  effectiveOptions: QuoteOptions;
  priceFromClp: number | null;
}

export type QuoteOfferingContextResult =
  | { ok: true; data: QuoteOfferingContext }
  | { ok: false; reason: 'not_found' | 'category_mismatch' | 'inactive' };

/**
 * Resuelve el contexto completo de una oferta para el wizard — la misma
 * resolución (oferta↔categoría↔producto, activo/visible, exclusiones de
 * configuración) que `resolveAndValidateLensSelection` vuelve a ejercer al
 * enviar la solicitud. Fail-closed: cualquier duda devuelve `ok: false`,
 * nunca datos parciales.
 */
export async function getQuoteOfferingContext(categoryId: string, offeringId: string): Promise<QuoteOfferingContextResult> {
  const offering = await findOfferingWithWizardContext(offeringId);
  if (!offering || offering.deletedAt !== null) {
    return { ok: false, reason: 'not_found' };
  }
  if (offering.categoryId !== categoryId) {
    return { ok: false, reason: 'category_mismatch' };
  }
  if (
    !offering.category.active ||
    !offering.category.visible ||
    isReservedLegacyCategorySlug(offering.category.slug) ||
    !offering.active ||
    !offering.visible ||
    !offering.product.visible
  ) {
    return { ok: false, reason: 'inactive' };
  }

  const capabilities = parseCategoryCapabilities(offering.category.capabilities);
  const effectiveOptions = getEffectiveOfferingLensOptions({
    category: { capabilities: offering.category.capabilities },
    configuration: offering.configuration,
  });

  return {
    ok: true,
    data: {
      offeringId: offering.id,
      category: {
        id: offering.category.id,
        slug: offering.category.slug,
        name: offering.category.name,
        capabilities,
        quoteOptions: resolveCategoryQuoteOptions(capabilities.quoteOptions),
      },
      product: {
        id: offering.product.id,
        name: offering.product.name,
        code: offering.product.code,
        colors: offering.product.colors,
      },
      brand: offering.product.brand,
      effectiveOptions,
      priceFromClp: offering.priceFromClp,
    },
  };
}

export interface QuoteOfferingOption {
  id: string;
  label: string;
}

/** Paso "producto/oferta" del wizard cuando no llega un `offeringId` preseleccionado — nunca la lista plana de todos los productos (Fase 10 reemplaza `getQuoteFrameOptions`, que ignoraba la categoría). */
export async function listQuoteOfferingsForCategory(categoryId: string): Promise<QuoteOfferingOption[]> {
  const offerings = await listPublicOfferingsForCategory(categoryId);
  return offerings.map((offering) => {
    const product = offering.product;
    const priceLabel = offering.priceFromClp != null ? `Desde ${formatClp(offering.priceFromClp)}` : 'Cotizar';
    const name = offering.title ?? product.name;
    return {
      id: offering.id,
      label: product.brand?.name ? `${product.brand.name} — ${name} · ${product.code} · ${priceLabel}` : `${name} · ${product.code} · ${priceLabel}`,
    };
  });
}
