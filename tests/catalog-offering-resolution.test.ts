import { afterEach, describe, expect, it, vi } from 'vitest';

// Cubre 8.7 (gap identificado en la corrección de taxonomía de
// redesign-extensible-catalog-v2): el fallback de 3 segmentos de
// resolveOfferingPage() — una URL bajo una categoría legada/inexistente
// (p. ej. la extinta "armazones") debe redirigir vía el mismo mecanismo que
// /catalogo/[slug], mientras que una categoría VÁLIDA con un offeringSlug
// que no le pertenece debe seguir devolviendo 404, nunca capturar por error
// el slug de un producto ajeno.
const findActiveVisibleCategoryBySlug = vi.fn();
vi.mock('@/modules/catalog/category-repository', () => ({
  findActiveVisibleCategoryBySlug: (...args: unknown[]) => findActiveVisibleCategoryBySlug(...args),
  listActiveVisibleCategories: vi.fn(),
}));

const findDefaultPublicOfferingForProductSlug = vi.fn();
const findPublicOfferingByCategoryAndSlug = vi.fn();
const listOtherPublicOfferingsForProduct = vi.fn();
const listRelatedPublicOfferings = vi.fn();
const listPublicOfferingsForCategoryFiltered = vi.fn();
const listBrandsWithPublicOfferingsInCategory = vi.fn();

vi.mock('@/modules/catalog/offering-repository', () => ({
  findDefaultPublicOfferingForProductSlug: (...args: unknown[]) => findDefaultPublicOfferingForProductSlug(...args),
  findPublicOfferingByCategoryAndSlug: (...args: unknown[]) => findPublicOfferingByCategoryAndSlug(...args),
  listOtherPublicOfferingsForProduct: (...args: unknown[]) => listOtherPublicOfferingsForProduct(...args),
  listRelatedPublicOfferings: (...args: unknown[]) => listRelatedPublicOfferings(...args),
  listPublicOfferingsForCategoryFiltered: (...args: unknown[]) => listPublicOfferingsForCategoryFiltered(...args),
  listBrandsWithPublicOfferingsInCategory: (...args: unknown[]) => listBrandsWithPublicOfferingsInCategory(...args),
}));

const { resolveOfferingPage } = await import('@/modules/catalog/service');

function fakeOffering(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'off_1',
    productId: 'prod_1',
    slug: 'coral',
    title: null,
    commercialDescription: null,
    priceFromClp: 19990,
    category: { slug: 'lentes-opticos', name: 'Lentes ópticos' },
    product: {
      id: 'prod_1',
      code: 'PV-1',
      name: 'Coral',
      gender: 'UNISEX',
      shape: 'REDONDO',
      material: 'ACETATO',
      available: true,
      badge: null,
      sizes: null,
      description: null,
      colors: [],
      images: [],
      brand: null,
    },
    ...overrides,
  };
}

describe('modules/catalog/service — resolveOfferingPage (fallback de 3 segmentos, 8.7)', () => {
  afterEach(() => vi.clearAllMocks());

  it('resuelve normalmente cuando la categoría y la oferta existen', async () => {
    findActiveVisibleCategoryBySlug.mockResolvedValue({
      slug: 'lentes-opticos',
      name: 'Lentes ópticos',
      shortDescription: null,
      icon: null,
      imagePath: null,
    });
    findPublicOfferingByCategoryAndSlug.mockResolvedValue(fakeOffering());
    listOtherPublicOfferingsForProduct.mockResolvedValue([]);
    listRelatedPublicOfferings.mockResolvedValue([]);

    const result = await resolveOfferingPage('lentes-opticos', 'coral');
    expect(result.kind).toBe('found');
  });

  it('redirige cuando categorySlug es una categoría legada/inexistente pero offeringSlug resuelve como producto legado', async () => {
    findActiveVisibleCategoryBySlug.mockResolvedValue(null); // "armazones" ya no existe
    findDefaultPublicOfferingForProductSlug.mockResolvedValue({ categorySlug: 'lentes-opticos', offeringSlug: 'coral' });

    const result = await resolveOfferingPage('armazones', 'coral');
    expect(result).toEqual({ kind: 'redirect', categorySlug: 'lentes-opticos', offeringSlug: 'coral' });
    // Nunca intenta resolver la oferta directamente contra una categoría inexistente.
    expect(findPublicOfferingByCategoryAndSlug).not.toHaveBeenCalled();
  });

  it('devuelve 404 cuando categorySlug no existe y offeringSlug tampoco es un producto legado', async () => {
    findActiveVisibleCategoryBySlug.mockResolvedValue(null);
    findDefaultPublicOfferingForProductSlug.mockResolvedValue(null);

    const result = await resolveOfferingPage('categoria-que-no-existe', 'nada');
    expect(result).toEqual({ kind: 'not_found' });
  });

  it('devuelve 404 (no redirect) cuando categorySlug es válido pero offeringSlug no le pertenece — nunca deja que un producto capture el slug de una categoría vigente', async () => {
    findActiveVisibleCategoryBySlug.mockResolvedValue({
      slug: 'lentes-opticos',
      name: 'Lentes ópticos',
      shortDescription: null,
      icon: null,
      imagePath: null,
    });
    findPublicOfferingByCategoryAndSlug.mockResolvedValue(null);

    const result = await resolveOfferingPage('lentes-opticos', 'slug-de-otro-producto');
    expect(result).toEqual({ kind: 'not_found' });
    // Crítico: NO se intenta el fallback legado cuando la categoría sí es válida.
    expect(findDefaultPublicOfferingForProductSlug).not.toHaveBeenCalled();
  });
});
