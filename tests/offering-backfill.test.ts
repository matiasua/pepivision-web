import { afterEach, describe, expect, it, vi } from 'vitest';

// Fase 15 (redesign-extensible-catalog-v2 — migración, backfill y corte
// definitivo, tarea 15.8) a nivel unitario (mocked). El comportamiento
// real contra Postgres vive en
// tests-integration/offering-backfill.test.ts. Mismo patrón que
// tests/taxonomy-migration.test.ts: verifica qué llama, en qué orden, y
// crucialmente qué NUNCA llama (update sobre una oferta existente).
const categoryFindUniquePlan = vi.fn();
const categoryFindUniqueTx = vi.fn();
const productFindManyPlan = vi.fn();
const productFindManyTx = vi.fn();
const productOfferingCount = vi.fn();
const productOfferingAggregatePlan = vi.fn();
const productOfferingAggregateTx = vi.fn();
const productOfferingFindUniquePlan = vi.fn();
const productOfferingFindUniqueTx = vi.fn();
const productOfferingCountTx = vi.fn();
const productOfferingCreate = vi.fn();
const productOfferingUpdate = vi.fn();

const tx = {
  category: { findUnique: categoryFindUniqueTx },
  product: { findMany: productFindManyTx },
  productOffering: {
    aggregate: productOfferingAggregateTx,
    findUnique: productOfferingFindUniqueTx,
    count: productOfferingCountTx,
    create: productOfferingCreate,
    update: productOfferingUpdate,
  },
};

vi.mock('@/lib/prisma', () => ({
  prisma: {
    category: { findUnique: categoryFindUniquePlan },
    product: { findMany: productFindManyPlan },
    productOffering: {
      count: productOfferingCount,
      aggregate: productOfferingAggregatePlan,
      findUnique: productOfferingFindUniquePlan,
    },
    $transaction: (fn: (tx: unknown) => unknown) => fn(tx),
  },
}));

const { planProductOfferingBackfill, executeProductOfferingBackfill } = await import('@/modules/catalog/offering-backfill');

function product(overrides: Partial<Record<string, unknown>> = {}) {
  return { id: 'prod_1', code: 'PV-101', slug: 'coral', name: 'Coral', priceFromClp: 19990, ...overrides };
}

describe('modules/catalog/offering-backfill — planProductOfferingBackfill (unit, mocked)', () => {
  afterEach(() => vi.clearAllMocks());

  it('plans one offering per candidate product, copying its exact priceFromClp and slug, targeting lentes-opticos only', async () => {
    categoryFindUniquePlan.mockResolvedValue({ id: 'cat_optical' });
    productFindManyPlan.mockResolvedValue([product()]);
    productOfferingCount.mockResolvedValue(4); // ofertas ya existentes, preservadas
    productOfferingAggregatePlan.mockResolvedValue({ _max: { sortOrder: 2 } });
    productOfferingFindUniquePlan.mockResolvedValue(null); // sin colisión de slug

    const plan = await planProductOfferingBackfill();

    expect(plan.categorySlug).toBe('lentes-opticos');
    expect(plan.categoryFound).toBe(true);
    expect(plan.candidates).toEqual([
      { productId: 'prod_1', productCode: 'PV-101', plannedSlug: 'coral', priceFromClp: 19990, plannedSortOrder: 3 },
    ]);
    expect(plan.existingOfferingsPreserved).toBe(4);
    expect(plan.totalOfferingsAfterWrite).toBe(5);
    expect(plan.dataConflicts).toEqual([]);
    expect(plan.slugConflicts).toEqual([]);
  });

  it('selects candidates using visible:true and offerings:none — never a product that already has an offering', async () => {
    categoryFindUniquePlan.mockResolvedValue({ id: 'cat_optical' });
    productFindManyPlan.mockResolvedValue([]);
    productOfferingCount.mockResolvedValue(0);
    productOfferingAggregatePlan.mockResolvedValue({ _max: { sortOrder: null } });

    await planProductOfferingBackfill();

    expect(productFindManyPlan).toHaveBeenCalledWith(
      expect.objectContaining({ where: { visible: true, offerings: { none: {} } } })
    );
  });

  it('reports a data conflict (never fabricates 0) when priceFromClp is not a valid non-negative integer', async () => {
    categoryFindUniquePlan.mockResolvedValue({ id: 'cat_optical' });
    productFindManyPlan.mockResolvedValue([product({ priceFromClp: -5 })]);
    productOfferingCount.mockResolvedValue(0);
    productOfferingAggregatePlan.mockResolvedValue({ _max: { sortOrder: null } });

    const plan = await planProductOfferingBackfill();

    expect(plan.candidates).toEqual([]);
    expect(plan.dataConflicts).toHaveLength(1);
    expect(plan.dataConflicts[0].productId).toBe('prod_1');
  });

  it('reports a slug conflict and excludes that candidate when the target category already has an offering at that slug', async () => {
    categoryFindUniquePlan.mockResolvedValue({ id: 'cat_optical' });
    productFindManyPlan.mockResolvedValue([product()]);
    productOfferingCount.mockResolvedValue(1);
    productOfferingAggregatePlan.mockResolvedValue({ _max: { sortOrder: 0 } });
    productOfferingFindUniquePlan.mockResolvedValue({ id: 'off_existing' });

    const plan = await planProductOfferingBackfill();

    expect(plan.candidates).toEqual([]);
    expect(plan.slugConflicts).toEqual([
      { productId: 'prod_1', productCode: 'PV-101', slug: 'coral', conflictingOfferingId: 'off_existing' },
    ]);
  });

  it('flags categoryFound: false when lentes-opticos does not exist yet — never invents a category', async () => {
    categoryFindUniquePlan.mockResolvedValue(null);
    productFindManyPlan.mockResolvedValue([product()]);
    productOfferingCount.mockResolvedValue(0);
    productOfferingAggregatePlan.mockResolvedValue({ _max: { sortOrder: null } });

    const plan = await planProductOfferingBackfill();

    expect(plan.categoryFound).toBe(false);
    // Sin categoría resuelta, no se verifica colisión de slug (no hay dónde) pero sí se sigue reportando el candidato.
    expect(plan.candidates).toHaveLength(1);
  });

  it('an idempotent second plan (no remaining candidates) reports an empty plan, not an error', async () => {
    categoryFindUniquePlan.mockResolvedValue({ id: 'cat_optical' });
    productFindManyPlan.mockResolvedValue([]);
    productOfferingCount.mockResolvedValue(11);
    productOfferingAggregatePlan.mockResolvedValue({ _max: { sortOrder: 10 } });

    const plan = await planProductOfferingBackfill();

    expect(plan.candidates).toEqual([]);
    expect(plan.totalOfferingsAfterWrite).toBe(11);
  });

  it('never includes technical/sensitive fields (storageKey, configuration, personal data) in the plan', async () => {
    categoryFindUniquePlan.mockResolvedValue({ id: 'cat_optical' });
    productFindManyPlan.mockResolvedValue([product()]);
    productOfferingCount.mockResolvedValue(0);
    productOfferingAggregatePlan.mockResolvedValue({ _max: { sortOrder: null } });
    productOfferingFindUniquePlan.mockResolvedValue(null);

    const plan = await planProductOfferingBackfill();

    const serialized = JSON.stringify(plan);
    for (const forbidden of ['storageKey', 'configuration', 'password', 'email']) {
      expect(serialized).not.toContain(forbidden);
    }
  });
});

describe('modules/catalog/offering-backfill — executeProductOfferingBackfill (unit, mocked)', () => {
  afterEach(() => vi.clearAllMocks());

  it('creates exactly one ProductOffering per candidate, copying priceFromClp/slug, targeting lentes-opticos, never updating an existing row', async () => {
    categoryFindUniqueTx.mockResolvedValue({ id: 'cat_optical' });
    productFindManyTx.mockResolvedValue([product()]);
    productOfferingAggregateTx.mockResolvedValue({ _max: { sortOrder: 2 } });
    productOfferingCountTx.mockResolvedValue(0); // sigue sin oferta
    productOfferingFindUniqueTx.mockResolvedValue(null); // sin colisión
    productOfferingCreate.mockResolvedValue({ id: 'off_new_1' });

    const result = await executeProductOfferingBackfill();

    expect(productOfferingCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        productId: 'prod_1',
        categoryId: 'cat_optical',
        slug: 'coral',
        priceFromClp: 19990,
        active: true,
        visible: true,
        sortOrder: 3,
      }),
    });
    expect(result).toEqual({ createdOfferingIds: ['off_new_1'], createdCount: 1 });
    expect(productOfferingUpdate).not.toHaveBeenCalled();
  });

  it('aborts the entire batch (throws, no rows created) when a candidate already gained an offering since the plan was made', async () => {
    categoryFindUniqueTx.mockResolvedValue({ id: 'cat_optical' });
    productFindManyTx.mockResolvedValue([product()]);
    productOfferingAggregateTx.mockResolvedValue({ _max: { sortOrder: null } });
    productOfferingCountTx.mockResolvedValue(1); // ya tiene oferta — el plan quedó obsoleto

    await expect(executeProductOfferingBackfill()).rejects.toThrow();
    expect(productOfferingCreate).not.toHaveBeenCalled();
  });

  it('aborts the entire batch when a slug collision is found at write time (defensive re-check)', async () => {
    categoryFindUniqueTx.mockResolvedValue({ id: 'cat_optical' });
    productFindManyTx.mockResolvedValue([product()]);
    productOfferingAggregateTx.mockResolvedValue({ _max: { sortOrder: null } });
    productOfferingCountTx.mockResolvedValue(0);
    productOfferingFindUniqueTx.mockResolvedValue({ id: 'off_existing' });

    await expect(executeProductOfferingBackfill()).rejects.toThrow();
    expect(productOfferingCreate).not.toHaveBeenCalled();
  });

  it('throws instead of silently proceeding when lentes-opticos does not exist', async () => {
    categoryFindUniqueTx.mockResolvedValue(null);

    await expect(executeProductOfferingBackfill()).rejects.toThrow();
    expect(productOfferingCreate).not.toHaveBeenCalled();
  });

  it('a second execution with zero remaining candidates creates nothing (idempotent)', async () => {
    categoryFindUniqueTx.mockResolvedValue({ id: 'cat_optical' });
    productFindManyTx.mockResolvedValue([]);
    productOfferingAggregateTx.mockResolvedValue({ _max: { sortOrder: 9 } });

    const result = await executeProductOfferingBackfill();

    expect(result).toEqual({ createdOfferingIds: [], createdCount: 0 });
    expect(productOfferingCreate).not.toHaveBeenCalled();
  });

  it('rejects an invalid priceFromClp at write time too — never fabricates a price', async () => {
    categoryFindUniqueTx.mockResolvedValue({ id: 'cat_optical' });
    productFindManyTx.mockResolvedValue([product({ priceFromClp: -1 })]);
    productOfferingAggregateTx.mockResolvedValue({ _max: { sortOrder: null } });

    await expect(executeProductOfferingBackfill()).rejects.toThrow();
    expect(productOfferingCreate).not.toHaveBeenCalled();
  });
});
