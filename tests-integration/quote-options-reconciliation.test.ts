// Fase 9 (redesign-extensible-catalog-v2) — reconciliación de
// `quoteOptions` contra las DOS CATEGORÍAS CANÓNICAS REALES
// (`lentes-opticos`, `lentes-de-sol`), deliberadamente (a diferencia de
// tests-integration/quote-options.test.ts, que usa categorías sintéticas
// propias): el riesgo que esta suite cubre es exactamente "¿qué pasa con
// las dos filas reales que ya existían antes de que `quoteOptions`
// existiera?" — no se puede responder con una categoría de prueba.
//
// Nunca se modifica destructivamente: se toma una foto de
// `capabilities` de ambas categorías al iniciar y se restaura
// exactamente al terminar (mismo criterio ya establecido en
// tests-integration/category-seed.test.ts → "never overwrites an
// administratively-edited category").
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import type { Prisma } from '@prisma/client';
import { seedCategories } from '../prisma/seed';
import {
  reconcileCanonicalQuoteOptions,
  type QuoteOptionsReconciliationResult,
} from '@/modules/catalog/quote-options-reconciliation';
import { getCategoryLensOptions } from '@/modules/catalog/quote-options-service';
import { LENTES_OPTICOS_QUOTE_OPTIONS, LENTES_DE_SOL_QUOTE_OPTIONS } from '@/modules/catalog/quote-options';
import { prisma } from './helpers';

const CANONICAL_SLUGS = ['lentes-opticos', 'lentes-de-sol'] as const;

function resultFor(results: QuoteOptionsReconciliationResult[], slug: string) {
  return results.find((r) => r.slug === slug);
}

describe('modules/catalog/quote-options-reconciliation — categorías canónicas reales (integration)', () => {
  const originalCapabilities: Record<string, Prisma.JsonValue> = {};

  beforeAll(async () => {
    await seedCategories(); // garantiza que ambas existen; no duplica ni pisa una fila ya existente.
    for (const slug of CANONICAL_SLUGS) {
      const category = await prisma.category.findUniqueOrThrow({ where: { slug } });
      originalCapabilities[slug] = category.capabilities as Prisma.JsonValue;
    }
  });

  afterAll(async () => {
    // 8 — cleanup selectivo: solo se toca `capabilities` de estas dos filas
    // exactas, restaurado byte a byte a como estaban antes de esta suite.
    // Nunca se borra la fila, nunca se toca name/slug/active/visible/etc.
    for (const slug of CANONICAL_SLUGS) {
      await prisma.category.update({ where: { slug }, data: { capabilities: originalCapabilities[slug] as Prisma.InputJsonValue } });
    }
  });

  it('1 — simula el estado real anterior: categoría canónica sin quoteOptions', async () => {
    for (const slug of CANONICAL_SLUGS) {
      const category = await prisma.category.findUniqueOrThrow({ where: { slug } });
      const capabilities = { ...(category.capabilities as Record<string, unknown>) };
      delete capabilities.quoteOptions;
      await prisma.category.update({ where: { slug }, data: { capabilities: capabilities as Prisma.InputJsonValue } });
    }

    for (const slug of CANONICAL_SLUGS) {
      const category = await prisma.category.findUniqueOrThrow({ where: { slug } });
      expect(Object.prototype.hasOwnProperty.call(category.capabilities as object, 'quoteOptions')).toBe(false);
    }
  });

  it('2 — la reconciliación agrega la matriz canónica a ambas', async () => {
    const results = await reconcileCanonicalQuoteOptions();
    expect(resultFor(results, 'lentes-opticos')?.action).toBe('added');
    expect(resultFor(results, 'lentes-de-sol')?.action).toBe('added');

    const optico = await prisma.category.findUniqueOrThrow({ where: { slug: 'lentes-opticos' } });
    expect((optico.capabilities as { quoteOptions?: unknown }).quoteOptions).toEqual(LENTES_OPTICOS_QUOTE_OPTIONS);
    const sol = await prisma.category.findUniqueOrThrow({ where: { slug: 'lentes-de-sol' } });
    expect((sol.capabilities as { quoteOptions?: unknown }).quoteOptions).toEqual(LENTES_DE_SOL_QUOTE_OPTIONS);
  });

  it('3 — una segunda ejecución no cambia nada (idempotente)', async () => {
    const before = await prisma.category.findMany({ where: { slug: { in: [...CANONICAL_SLUGS] } }, orderBy: { slug: 'asc' } });

    const results = await reconcileCanonicalQuoteOptions();
    expect(results.every((r) => r.action === 'preserved')).toBe(true);

    const after = await prisma.category.findMany({ where: { slug: { in: [...CANONICAL_SLUGS] } }, orderBy: { slug: 'asc' } });
    expect(after.map((c) => c.capabilities)).toEqual(before.map((c) => c.capabilities));
  });

  it('4 — una configuración administrativa válida (distinta de la canónica) se preserva sin sobrescritura', async () => {
    const custom = { version: 1 as const, lensTypes: ['monofocal'], treatments: ['antirreflejo'], additionalOptions: [] };
    const current = await prisma.category.findUniqueOrThrow({ where: { slug: 'lentes-opticos' } });
    await prisma.category.update({
      where: { slug: 'lentes-opticos' },
      data: { capabilities: { ...(current.capabilities as object), quoteOptions: custom } as Prisma.InputJsonValue },
    });

    const results = await reconcileCanonicalQuoteOptions();
    expect(resultFor(results, 'lentes-opticos')?.action).toBe('preserved');

    const after = await prisma.category.findUniqueOrThrow({ where: { slug: 'lentes-opticos' } });
    expect((after.capabilities as { quoteOptions?: unknown }).quoteOptions).toEqual(custom);

    // Deja lentes-opticos en la matriz canónica para las pruebas siguientes.
    await prisma.category.update({
      where: { slug: 'lentes-opticos' },
      data: { capabilities: { ...(current.capabilities as object), quoteOptions: LENTES_OPTICOS_QUOTE_OPTIONS } as Prisma.InputJsonValue },
    });
  });

  it('5 — un quoteOptions inválido se reporta como conflicto, nunca se sobrescribe', async () => {
    const invalid = { version: 1, lensTypes: ['inventado'], treatments: [], additionalOptions: [] };
    const current = await prisma.category.findUniqueOrThrow({ where: { slug: 'lentes-de-sol' } });
    await prisma.category.update({
      where: { slug: 'lentes-de-sol' },
      data: { capabilities: { ...(current.capabilities as object), quoteOptions: invalid } as Prisma.InputJsonValue },
    });

    const results = await reconcileCanonicalQuoteOptions();
    const result = resultFor(results, 'lentes-de-sol');
    expect(result?.action).toBe('conflict');
    expect(result?.issues?.length ?? 0).toBeGreaterThan(0);

    const after = await prisma.category.findUniqueOrThrow({ where: { slug: 'lentes-de-sol' } });
    expect((after.capabilities as { quoteOptions?: unknown }).quoteOptions).toEqual(invalid); // sin cambios

    // Deja lentes-de-sol en la matriz canónica para las pruebas siguientes.
    await prisma.category.update({
      where: { slug: 'lentes-de-sol' },
      data: { capabilities: { ...(current.capabilities as object), quoteOptions: LENTES_DE_SOL_QUOTE_OPTIONS } as Prisma.InputJsonValue },
    });
  });

  it('6 — ambas categorías reales resuelven una matriz válida vía getCategoryLensOptions', async () => {
    const optico = await getCategoryLensOptions('lentes-opticos');
    const sol = await getCategoryLensOptions('lentes-de-sol');
    expect(optico.lensTypes.length).toBeGreaterThan(0);
    expect(optico.treatments.length).toBeGreaterThan(0);
    expect(sol.lensTypes.length).toBeGreaterThan(0);
    expect(sol.treatments.length).toBeGreaterThan(0);
  });

  it('7 — ningún ProductOffering se pierde ni se crea (sin backfill)', async () => {
    const before = await prisma.productOffering.count();
    await reconcileCanonicalQuoteOptions();
    const after = await prisma.productOffering.count();
    expect(after).toBe(before);
  });
});
