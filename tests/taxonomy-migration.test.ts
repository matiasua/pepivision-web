import { afterEach, describe, expect, it, vi } from 'vitest';

// Cubre 5.6/5.7 a nivel unitario (mocked) — el comportamiento real contra
// Postgres vive en tests-integration/category-taxonomy-migration.test.ts.
// Este archivo verifica la orquestación: qué llama, en qué orden, y
// crucialmente qué NUNCA llama (ProductOffering.create — la migración de
// taxonomía nunca crea ofertas nuevas, solo remapea/renombra filas
// existentes; el backfill de Lentes ópticos para productos sin oferta
// previa es una tarea de Fase 15, no de esta migración).
const categoryFindUnique = vi.fn();
const categoryUpdate = vi.fn();
const categoryDelete = vi.fn();
const productOfferingFindMany = vi.fn();
const productOfferingFindUnique = vi.fn();
const productOfferingUpdate = vi.fn();
const productOfferingCreate = vi.fn();
const productOfferingCount = vi.fn();

const tx = {
  category: { findUnique: categoryFindUnique, update: categoryUpdate, delete: categoryDelete },
  productOffering: {
    findMany: productOfferingFindMany,
    findUnique: productOfferingFindUnique,
    update: productOfferingUpdate,
    create: productOfferingCreate,
    count: productOfferingCount,
  },
};

vi.mock('@/lib/prisma', () => ({
  prisma: { $transaction: (fn: (tx: unknown) => unknown) => fn(tx) },
}));

const { migrateToDefinitiveTaxonomy } = await import('@/modules/catalog/taxonomy-migration');

function categoryRow(slug: string, id = `cat_${slug}`) {
  return { id, slug };
}

describe('modules/catalog/taxonomy-migration — migrateToDefinitiveTaxonomy (unit, mocked)', () => {
  afterEach(() => vi.clearAllMocks());

  it('is a no-op on a database that never had the legacy categories', async () => {
    categoryFindUnique.mockResolvedValue(null); // ni lentes-de-sol-opticos ni armazones existen

    const report = await migrateToDefinitiveTaxonomy();

    expect(report).toEqual({
      renamedLentesDeSolOpticos: false,
      remappedOfferingIds: [],
      conflicts: [],
      armazonesCategoryDeleted: false,
      armazonesCategoryRemainingOfferings: 0,
    });
    expect(categoryUpdate).not.toHaveBeenCalled();
    expect(categoryDelete).not.toHaveBeenCalled();
    expect(productOfferingCreate).not.toHaveBeenCalled(); // nunca crea ofertas — no hay backfill aquí
  });

  it('renames lentes-de-sol-opticos to lentes-de-sol in place when the definitive slug does not exist yet', async () => {
    categoryFindUnique.mockImplementation(({ where }: { where: { slug: string } }) => {
      if (where.slug === 'lentes-de-sol-opticos') return categoryRow('lentes-de-sol-opticos');
      if (where.slug === 'lentes-de-sol') return null;
      if (where.slug === 'armazones') return null;
      return null;
    });

    const report = await migrateToDefinitiveTaxonomy();

    expect(report.renamedLentesDeSolOpticos).toBe(true);
    expect(categoryUpdate).toHaveBeenCalledWith({
      where: { id: 'cat_lentes-de-sol-opticos' },
      data: { slug: 'lentes-de-sol', name: 'Lentes de sol' },
    });
  });

  it('does not rename lentes-de-sol-opticos when lentes-de-sol already exists (never merges two live rows)', async () => {
    categoryFindUnique.mockImplementation(({ where }: { where: { slug: string } }) => {
      if (where.slug === 'lentes-de-sol-opticos') return categoryRow('lentes-de-sol-opticos');
      if (where.slug === 'lentes-de-sol') return categoryRow('lentes-de-sol');
      return null;
    });

    const report = await migrateToDefinitiveTaxonomy();

    expect(report.renamedLentesDeSolOpticos).toBe(false);
    expect(categoryUpdate).not.toHaveBeenCalled();
  });

  it('remaps every armazones offering to lentes-opticos and deletes armazones once empty', async () => {
    categoryFindUnique.mockImplementation(({ where }: { where: { slug: string } }) => {
      if (where.slug === 'lentes-de-sol-opticos') return null;
      if (where.slug === 'armazones') return categoryRow('armazones');
      if (where.slug === 'lentes-opticos') return categoryRow('lentes-opticos');
      return null;
    });
    productOfferingFindMany.mockResolvedValue([{ id: 'off_1', productId: 'prod_1', categoryId: 'cat_armazones' }]);
    productOfferingFindUnique.mockResolvedValue(null); // sin oferta previa en lentes-opticos para prod_1
    productOfferingCount.mockResolvedValue(0); // ya remapeada, queda vacía

    const report = await migrateToDefinitiveTaxonomy();

    expect(productOfferingUpdate).toHaveBeenCalledWith({ where: { id: 'off_1' }, data: { categoryId: 'cat_lentes-opticos' } });
    expect(report.remappedOfferingIds).toEqual(['off_1']);
    expect(report.armazonesCategoryDeleted).toBe(true);
    expect(categoryDelete).toHaveBeenCalledWith({ where: { id: 'cat_armazones' } });
  });

  it('flags a conflict instead of merging when the product already has a lentes-opticos offering, and does not delete armazones', async () => {
    categoryFindUnique.mockImplementation(({ where }: { where: { slug: string } }) => {
      if (where.slug === 'lentes-de-sol-opticos') return null;
      if (where.slug === 'armazones') return categoryRow('armazones');
      if (where.slug === 'lentes-opticos') return categoryRow('lentes-opticos');
      return null;
    });
    productOfferingFindMany.mockResolvedValue([{ id: 'off_armazones', productId: 'prod_1', categoryId: 'cat_armazones' }]);
    productOfferingFindUnique.mockResolvedValue({ id: 'off_optical' }); // ya existe en lentes-opticos
    productOfferingCount.mockResolvedValue(1); // sigue quedando la oferta en conflicto

    const report = await migrateToDefinitiveTaxonomy();

    expect(productOfferingUpdate).not.toHaveBeenCalled();
    expect(report.conflicts).toEqual([
      { productId: 'prod_1', armazonesOfferingId: 'off_armazones', lentesOpticosOfferingId: 'off_optical' },
    ]);
    expect(report.armazonesCategoryDeleted).toBe(false);
    expect(categoryDelete).not.toHaveBeenCalled();
  });

  it('throws instead of silently skipping when armazones exists but lentes-opticos does not (unsafe partial state)', async () => {
    categoryFindUnique.mockImplementation(({ where }: { where: { slug: string } }) => {
      if (where.slug === 'lentes-de-sol-opticos') return null;
      if (where.slug === 'armazones') return categoryRow('armazones');
      if (where.slug === 'lentes-opticos') return null;
      return null;
    });

    await expect(migrateToDefinitiveTaxonomy()).rejects.toThrow();
    expect(productOfferingUpdate).not.toHaveBeenCalled();
    expect(categoryDelete).not.toHaveBeenCalled();
  });
});
