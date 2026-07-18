// Fase 9 — motor de compatibilidades: capa server-aware sobre
// quote-options.ts. Resuelve categoryId/categorySlug/offeringId contra
// PostgreSQL (nunca confía en el cliente) y delega la validación de
// dominio a la función pura `validateLensSelection`. Separado de
// quote-options.ts a propósito: ese módulo no depende de Prisma y es
// trivialmente testeable sin base de datos; este sí.
import { findCategoryById, findCategoryBySlug } from './category-repository';
import { findOfferingWithLensContext } from './offering-repository';
import {
  resolveCategoryQuoteOptions,
  validateLensSelection,
  type LensSelectionContext,
  type LensSelectionResult,
  type QuoteOptions,
} from './quote-options';

/**
 * `getCategoryLensOptions(categorySlug)` (contrato de la Fase 9 para la
 * fase siguiente): opciones de cristal/tratamientos/opciones adicionales
 * de una categoría, resueltas fail-closed. Una categoría inexistente,
 * inactiva/oculta, o sin `quoteOptions` configurado devuelve la allowlist
 * vacía — nunca lanza, nunca habilita nada por default.
 */
export async function getCategoryLensOptions(categorySlug: string): Promise<QuoteOptions> {
  const category = await findCategoryBySlug(categorySlug);
  if (!category || !category.active || !category.visible) {
    return resolveCategoryQuoteOptions(null);
  }
  return resolveCategoryQuoteOptions((category.capabilities as { quoteOptions?: unknown } | null)?.quoteOptions);
}

/**
 * `resolveAndValidateLensSelection(input)`: variante server-aware de
 * `validateLensSelection` — resuelve `categoryId`/`categorySlug` y, si
 * viene informado, `offeringId` (verificando pertenencia oferta↔categoría↔
 * producto, ver `findOfferingWithLensContext`) directamente contra
 * PostgreSQL antes de validar. Nunca confía en un nombre, precio o
 * capability enviado por el cliente — mismo criterio que
 * `verifyOfferingOwnership` (Fase 3) ya aplica a la mutación de ofertas.
 */
export async function resolveAndValidateLensSelection(rawInput: unknown): Promise<LensSelectionResult> {
  const input = rawInput as { categoryId?: unknown; categorySlug?: unknown; offeringId?: unknown } | null | undefined;

  const categoryId = typeof input?.categoryId === 'string' ? input.categoryId : undefined;
  const categorySlug = typeof input?.categorySlug === 'string' ? input.categorySlug : undefined;
  const offeringId = typeof input?.offeringId === 'string' ? input.offeringId : undefined;

  const category = categoryId ? await findCategoryById(categoryId) : categorySlug ? await findCategoryBySlug(categorySlug) : null;

  if (!category) {
    return {
      ok: false,
      errors: [{ field: 'category', code: 'unknown_category', message: 'La categoría indicada no existe.' }],
    };
  }

  let offeringContext: LensSelectionContext['offering'] = undefined;
  let productContext: LensSelectionContext['product'] = undefined;

  if (offeringId) {
    const offering = await findOfferingWithLensContext(offeringId);
    if (!offering) {
      return {
        ok: false,
        errors: [{ field: 'offeringId', code: 'offering_mismatch', message: 'La oferta indicada no existe.' }],
      };
    }
    offeringContext = {
      id: offering.id,
      categoryId: offering.categoryId,
      productId: offering.productId,
      active: offering.active,
      visible: offering.visible,
      deletedAt: offering.deletedAt,
      configuration: offering.configuration,
    };
    productContext = offering.product;
  }

  const context: LensSelectionContext = {
    category: {
      id: category.id,
      slug: category.slug,
      active: category.active,
      visible: category.visible,
      capabilities: category.capabilities,
    },
    offering: offeringContext,
    product: productContext,
  };

  return validateLensSelection(rawInput, context);
}
