// Fase 9 (redesign-extensible-catalog-v2) — reconciliación explícita de
// `Category.capabilities.quoteOptions` para las dos categorías canónicas
// reales. Necesaria porque `seedCategories()` usa `update: {}` (nunca
// pisa una categoría ya existente, para proteger ediciones admin) — una
// categoría sembrada ANTES de que `quoteOptions` existiera en el schema
// nunca lo recibe automáticamente por una corrida de seed posterior.
//
// Invocación exclusiva desde `prisma/seed.ts` o desde el script de
// reconciliación (`npm run reconcile:quote-options`) — nunca desde un
// request público ni una Server Action. No hace backfill de `Product` ni
// `ProductOffering`, y nunca toca `name`/`shortDescription`/`imagePath`/
// `sortOrder`/`active`/`visible` ni ningún otro campo de `capabilities`
// distinto de `quoteOptions`.
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { findCategoryBySlug } from './category-repository';
import { validateCategoryCapabilities } from './category-capabilities';
import { quoteOptionsSchema, LENTES_OPTICOS_QUOTE_OPTIONS, LENTES_DE_SOL_QUOTE_OPTIONS, type QuoteOptions } from './quote-options';

export interface CanonicalQuoteOptionsTarget {
  slug: string;
  canonical: QuoteOptions;
}

/** Las dos categorías definitivas — nunca una lista abierta/derivada de input. */
export const CANONICAL_QUOTE_OPTIONS_TARGETS: CanonicalQuoteOptionsTarget[] = [
  { slug: 'lentes-opticos', canonical: LENTES_OPTICOS_QUOTE_OPTIONS },
  { slug: 'lentes-de-sol', canonical: LENTES_DE_SOL_QUOTE_OPTIONS },
];

export type QuoteOptionsReconciliationDecision =
  | { action: 'add'; capabilities: Record<string, unknown> }
  | { action: 'preserve' }
  | { action: 'conflict'; issues: string[] };

/**
 * Pura, sin Prisma — decide qué hacer dado el `capabilities` crudo ya
 * leído y la matriz canónica de esa categoría. Reglas (ver la tarea de
 * cierre técnico de la Fase 9):
 * 1. `quoteOptions` ausente → agregar la matriz canónica (preservando
 *    cualquier otra clave ya presente en `capabilities`).
 * 2. `quoteOptions` presente y válido → preservar, nunca sobrescribir.
 * 3. `quoteOptions` presente pero inválido → nunca reemplazar
 *    silenciosamente; se reporta como conflicto explícito.
 */
export function decideQuoteOptionsReconciliation(
  rawCapabilities: unknown,
  canonical: QuoteOptions
): QuoteOptionsReconciliationDecision {
  const capabilities: Record<string, unknown> =
    rawCapabilities && typeof rawCapabilities === 'object' && !Array.isArray(rawCapabilities)
      ? { ...(rawCapabilities as Record<string, unknown>) }
      : {};

  const hasQuoteOptionsKey = Object.prototype.hasOwnProperty.call(capabilities, 'quoteOptions');
  if (!hasQuoteOptionsKey) {
    return { action: 'add', capabilities: { ...capabilities, quoteOptions: canonical } };
  }

  const parsed = quoteOptionsSchema.safeParse(capabilities.quoteOptions);
  if (parsed.success) {
    return { action: 'preserve' };
  }
  return {
    action: 'conflict',
    issues: parsed.error.issues.map((issue) => `${issue.path.join('.') || '(raíz)'}: ${issue.message}`),
  };
}

export interface QuoteOptionsReconciliationResult {
  slug: string;
  action: 'added' | 'preserved' | 'conflict' | 'missing_category';
  issues?: string[];
}

/**
 * DB-aware. Procesa las dos categorías canónicas de forma independiente
 * (una categoría con conflicto no impide reconciliar la otra — son filas
 * sin relación entre sí) — cada escritura es un único `update()` atómico
 * sobre el objeto `capabilities` completo, así que nunca queda un estado
 * parcial dentro de una misma categoría. Idempotente: una segunda corrida
 * sobre una categoría ya reconciliada siempre resuelve `preserved`.
 */
export async function reconcileCanonicalQuoteOptions(
  targets: CanonicalQuoteOptionsTarget[] = CANONICAL_QUOTE_OPTIONS_TARGETS
): Promise<QuoteOptionsReconciliationResult[]> {
  const results: QuoteOptionsReconciliationResult[] = [];

  for (const target of targets) {
    const category = await findCategoryBySlug(target.slug);
    if (!category) {
      // La creación de la categoría es responsabilidad de seedCategories()
      // (regla 4) — la reconciliación nunca crea categorías por su cuenta.
      results.push({ slug: target.slug, action: 'missing_category' });
      continue;
    }

    const decision = decideQuoteOptionsReconciliation(category.capabilities, target.canonical);

    if (decision.action === 'preserve') {
      results.push({ slug: target.slug, action: 'preserved' });
      continue;
    }

    if (decision.action === 'conflict') {
      results.push({ slug: target.slug, action: 'conflict', issues: decision.issues });
      continue;
    }

    // action === 'add': valida el objeto COMPLETO de capabilities antes de
    // escribir (nunca solo el fragmento quoteOptions) — mismo criterio
    // fail-closed que cualquier otra escritura de Category.capabilities.
    const validated = validateCategoryCapabilities(decision.capabilities);
    await prisma.category.update({
      where: { id: category.id },
      data: { capabilities: validated as unknown as Prisma.InputJsonValue },
    });
    results.push({ slug: target.slug, action: 'added' });
  }

  return results;
}
