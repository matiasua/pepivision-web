import { afterEach, describe, expect, it, vi } from 'vitest';
import { ValidationError } from '@/lib/errors';

const findCategoryById = vi.fn();
const findCategoryBySlugAny = vi.fn();
const createCategoryRow = vi.fn();
const updateCategoryRow = vi.fn();
const deleteCategoryRow = vi.fn();
const countCategoryOfferings = vi.fn();

vi.mock('@/modules/catalog/category-repository', () => ({
  findCategoryById: (...args: unknown[]) => findCategoryById(...args),
  findCategoryBySlugAny: (...args: unknown[]) => findCategoryBySlugAny(...args),
  createCategoryRow: (...args: unknown[]) => createCategoryRow(...args),
  updateCategoryRow: (...args: unknown[]) => updateCategoryRow(...args),
  deleteCategoryRow: (...args: unknown[]) => deleteCategoryRow(...args),
  countCategoryOfferings: (...args: unknown[]) => countCategoryOfferings(...args),
  listCategoriesForAdmin: vi.fn(),
  listActiveVisibleCategories: vi.fn(),
  findCategoryBySlug: vi.fn(),
}));

const { createCategory, updateCategory, deleteCategory } = await import('@/modules/catalog/category-service');

const VALID_CAPABILITIES = {
  requiresColor: true,
  allowsLensType: false,
  allowsTreatments: false,
  allowsPrescription: false,
  allowsPrescriptionAttachment: false,
  allowsLensTint: false,
  allowsFrameSelection: true,
};

function validInput(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    name: 'Lentes deportivos',
    shortDescription: undefined,
    description: undefined,
    active: true,
    visible: true,
    sortOrder: 0,
    icon: undefined,
    imagePath: undefined,
    seoTitle: undefined,
    seoDescription: undefined,
    capabilities: VALID_CAPABILITIES,
    ...overrides,
  } as never;
}

describe('modules/catalog/category-service — createCategory', () => {
  afterEach(() => vi.clearAllMocks());

  it('derives a unique slug from the name and persists validated capabilities', async () => {
    findCategoryBySlugAny.mockResolvedValue(null);
    createCategoryRow.mockResolvedValue({ id: 'cat_1', slug: 'lentes-deportivos' });

    await createCategory(validInput());

    expect(createCategoryRow).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'lentes-deportivos', capabilities: VALID_CAPABILITIES })
    );
  });

  it('appends a numeric suffix when the derived slug already exists', async () => {
    findCategoryBySlugAny.mockImplementation(async (slug: string) => (slug === 'lentes-deportivos' ? { id: 'other' } : null));
    createCategoryRow.mockResolvedValue({ id: 'cat_2', slug: 'lentes-deportivos-2' });

    await createCategory(validInput());

    expect(createCategoryRow).toHaveBeenCalledWith(expect.objectContaining({ slug: 'lentes-deportivos-2' }));
  });

  it('rejects malformed capabilities at write time instead of persisting them', async () => {
    await expect(createCategory(validInput({ capabilities: { allowsLensType: 'yes-please' } }))).rejects.toThrow(
      ValidationError
    );
    expect(createCategoryRow).not.toHaveBeenCalled();
  });
});

describe('modules/catalog/category-service — updateCategory', () => {
  afterEach(() => vi.clearAllMocks());

  it('rejects when the category no longer exists', async () => {
    findCategoryById.mockResolvedValue(null);

    await expect(updateCategory('cat_missing', validInput())).rejects.toThrow(ValidationError);
    expect(updateCategoryRow).not.toHaveBeenCalled();
  });

  it('never touches the existing slug', async () => {
    findCategoryById.mockResolvedValue({ id: 'cat_1', slug: 'armazones' });
    updateCategoryRow.mockResolvedValue({ id: 'cat_1' });

    await updateCategory('cat_1', validInput({ name: 'Armazones renombrados' }));

    const [, data] = updateCategoryRow.mock.calls[0];
    expect(data).not.toHaveProperty('slug');
  });

  it('rejects malformed capabilities at write time instead of persisting them', async () => {
    findCategoryById.mockResolvedValue({ id: 'cat_1', slug: 'armazones' });

    await expect(updateCategory('cat_1', validInput({ capabilities: { allowsLensType: 'yes-please' } }))).rejects.toThrow();
    expect(updateCategoryRow).not.toHaveBeenCalled();
  });
});

describe('modules/catalog/category-service — deleteCategory', () => {
  afterEach(() => vi.clearAllMocks());

  it('deletes immediately when the category has no offerings', async () => {
    findCategoryById.mockResolvedValue({ id: 'cat_1' });
    countCategoryOfferings.mockResolvedValue(0);

    const result = await deleteCategory('cat_1');

    expect(result).toEqual({ status: 'removed' });
    expect(deleteCategoryRow).toHaveBeenCalledWith('cat_1');
  });

  it('blocks deletion (no silent delete) when offerings still exist', async () => {
    findCategoryById.mockResolvedValue({ id: 'cat_1' });
    countCategoryOfferings.mockResolvedValue(2);

    const result = await deleteCategory('cat_1');

    expect(result).toEqual({ status: 'blocked', offeringCount: 2 });
    expect(deleteCategoryRow).not.toHaveBeenCalled();
  });

  it('rejects when the category no longer exists', async () => {
    findCategoryById.mockResolvedValue(null);

    await expect(deleteCategory('cat_missing')).rejects.toThrow(ValidationError);
  });
});
