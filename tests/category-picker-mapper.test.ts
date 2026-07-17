import { afterEach, describe, expect, it, vi } from 'vitest';

// Fase 6: getCategoryPicker()/getCategorySummary() son el mapper público
// que /catalogo consume para decidir imagen vs. fallback — cubre que
// `imagePath` pasa tal cual (null incluido) y nunca se inventa una URL.
const listActiveVisibleCategories = vi.fn();
const findActiveVisibleCategoryBySlug = vi.fn();
vi.mock('@/modules/catalog/category-repository', () => ({
  listActiveVisibleCategories: (...args: unknown[]) => listActiveVisibleCategories(...args),
  findActiveVisibleCategoryBySlug: (...args: unknown[]) => findActiveVisibleCategoryBySlug(...args),
}));

vi.mock('@/modules/catalog/offering-repository', () => ({
  findDefaultPublicOfferingForProductSlug: vi.fn(),
  findPublicOfferingByCategoryAndSlug: vi.fn(),
  listOtherPublicOfferingsForProduct: vi.fn(),
  listRelatedPublicOfferings: vi.fn(),
  listPublicOfferingsForCategoryFiltered: vi.fn(),
  listBrandsWithPublicOfferingsInCategory: vi.fn(),
}));

const { getCategoryPicker, getCategorySummary } = await import('@/modules/catalog/service');

describe('modules/catalog/service — getCategoryPicker / getCategorySummary (mapper público, Fase 6)', () => {
  afterEach(() => vi.clearAllMocks());

  it('passes through imagePath unchanged when a category has an uploaded image', async () => {
    listActiveVisibleCategories.mockResolvedValue([
      { slug: 'lentes-de-sol', name: 'Lentes de sol', shortDescription: null, icon: null, imagePath: 'https://storage.test/categories/cat_1/cover-abc.webp' },
    ]);

    const [category] = await getCategoryPicker();
    expect(category.imagePath).toBe('https://storage.test/categories/cat_1/cover-abc.webp');
  });

  it('passes through null imagePath as-is (never fabricates a placeholder URL)', async () => {
    listActiveVisibleCategories.mockResolvedValue([
      { slug: 'lentes-opticos', name: 'Lentes ópticos', shortDescription: null, icon: null, imagePath: null },
    ]);

    const [category] = await getCategoryPicker();
    expect(category.imagePath).toBeNull();
  });

  it('getCategorySummary also passes through null imagePath for a category with no image yet', async () => {
    findActiveVisibleCategoryBySlug.mockResolvedValue({
      slug: 'lentes-opticos',
      name: 'Lentes ópticos',
      shortDescription: null,
      icon: null,
      imagePath: null,
    });

    const category = await getCategorySummary('lentes-opticos');
    expect(category?.imagePath).toBeNull();
  });
});
