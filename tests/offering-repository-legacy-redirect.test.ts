import { afterEach, describe, expect, it, vi } from 'vitest';

// Cubre 8.1 (design.md → "Compatibilidad de URLs"): el destino por defecto
// del redirect legado de /catalogo/[slug] pasa de preferir "armazones"
// (extinta) a preferir "lentes-opticos".
const productFindFirst = vi.fn();
const productOfferingFindMany = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    product: { findFirst: (...args: unknown[]) => productFindFirst(...args) },
    productOffering: { findMany: (...args: unknown[]) => productOfferingFindMany(...args) },
  },
}));

const { findDefaultPublicOfferingForProductSlug } = await import('@/modules/catalog/offering-repository');

describe('modules/catalog/offering-repository — findDefaultPublicOfferingForProductSlug (8.1)', () => {
  afterEach(() => vi.clearAllMocks());

  it('prefers the lentes-opticos offering when the product has one', async () => {
    productFindFirst.mockResolvedValue({ id: 'prod_1' });
    productOfferingFindMany.mockResolvedValue([
      { slug: 'coral-sol', sortOrder: 0, category: { slug: 'lentes-de-sol' } },
      { slug: 'coral', sortOrder: 1, category: { slug: 'lentes-opticos' } },
    ]);

    const result = await findDefaultPublicOfferingForProductSlug('coral');
    expect(result).toEqual({ categorySlug: 'lentes-opticos', offeringSlug: 'coral' });
  });

  it('falls back to the first offering by sortOrder when there is no lentes-opticos offering (e.g. sun-only product)', async () => {
    productFindFirst.mockResolvedValue({ id: 'prod_1' });
    productOfferingFindMany.mockResolvedValue([{ slug: 'coral-sol', sortOrder: 0, category: { slug: 'lentes-de-sol' } }]);

    const result = await findDefaultPublicOfferingForProductSlug('coral');
    expect(result).toEqual({ categorySlug: 'lentes-de-sol', offeringSlug: 'coral-sol' });
  });

  it('never prefers the retired armazones category, even if a stale offering row still references it', async () => {
    productFindFirst.mockResolvedValue({ id: 'prod_1' });
    productOfferingFindMany.mockResolvedValue([
      { slug: 'coral', sortOrder: 0, category: { slug: 'armazones' } },
      { slug: 'coral', sortOrder: 1, category: { slug: 'lentes-opticos' } },
    ]);

    const result = await findDefaultPublicOfferingForProductSlug('coral');
    expect(result).toEqual({ categorySlug: 'lentes-opticos', offeringSlug: 'coral' });
  });

  it('returns null when the product has no visible offering', async () => {
    productFindFirst.mockResolvedValue({ id: 'prod_1' });
    productOfferingFindMany.mockResolvedValue([]);

    const result = await findDefaultPublicOfferingForProductSlug('coral');
    expect(result).toBeNull();
  });

  it('returns null when the product does not exist or is not visible', async () => {
    productFindFirst.mockResolvedValue(null);

    const result = await findDefaultPublicOfferingForProductSlug('no-existe');
    expect(result).toBeNull();
    expect(productOfferingFindMany).not.toHaveBeenCalled();
  });
});
