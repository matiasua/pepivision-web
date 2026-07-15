import { afterEach, describe, expect, it, vi } from 'vitest';
import { ValidationError } from '@/lib/errors';
import type { CurrentSession } from '@/modules/auth/service';

const findCategoryById = vi.fn();
const findCategoryBySlugAny = vi.fn();
const createCategoryRow = vi.fn();
const updateCategoryRow = vi.fn();
const deleteCategoryRow = vi.fn();
const countCategoryOfferings = vi.fn();
const setCategoryActiveRow = vi.fn();
const listCategoriesForAdmin = vi.fn();
const runInTransaction = vi.fn();
const reorderCategoryRows = vi.fn();

vi.mock('@/modules/catalog/category-repository', () => ({
  findCategoryById: (...args: unknown[]) => findCategoryById(...args),
  findCategoryBySlugAny: (...args: unknown[]) => findCategoryBySlugAny(...args),
  createCategoryRow: (...args: unknown[]) => createCategoryRow(...args),
  updateCategoryRow: (...args: unknown[]) => updateCategoryRow(...args),
  deleteCategoryRow: (...args: unknown[]) => deleteCategoryRow(...args),
  countCategoryOfferings: (...args: unknown[]) => countCategoryOfferings(...args),
  setCategoryActiveRow: (...args: unknown[]) => setCategoryActiveRow(...args),
  listCategoriesForAdmin: (...args: unknown[]) => listCategoriesForAdmin(...args),
  runInTransaction: (...args: unknown[]) => runInTransaction(...args),
  reorderCategoryRows: (...args: unknown[]) => reorderCategoryRows(...args),
  listActiveVisibleCategories: vi.fn(),
  findCategoryBySlug: vi.fn(),
}));

const recordAudit = vi.fn();
vi.mock('@/modules/auth/service', () => ({
  recordAudit: (...args: unknown[]) => recordAudit(...args),
}));

const { createCategory, updateCategory, deleteCategory, setCategoryActive, reorderCategories } = await import(
  '@/modules/catalog/category-service'
);

const actor: CurrentSession = {
  sessionId: 'sess_1',
  adminUser: { id: 'admin_1', email: 'admin@pepivision360.cl', name: 'Admin', role: 'SUPERADMIN', active: true },
};

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

  it('derives a unique slug from the name and persists validated capabilities, then audits category.created', async () => {
    findCategoryBySlugAny.mockResolvedValue(null);
    createCategoryRow.mockResolvedValue({ id: 'cat_1', slug: 'lentes-deportivos', name: 'Lentes deportivos' });

    await createCategory(validInput(), actor);

    expect(createCategoryRow).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'lentes-deportivos', capabilities: VALID_CAPABILITIES })
    );
    expect(recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: 'admin_1', action: 'category.created', targetType: 'Category', targetId: 'cat_1' })
    );
  });

  it('appends a numeric suffix when the derived slug already exists', async () => {
    findCategoryBySlugAny.mockImplementation(async (slug: string) => (slug === 'lentes-deportivos' ? { id: 'other' } : null));
    createCategoryRow.mockResolvedValue({ id: 'cat_2', slug: 'lentes-deportivos-2', name: 'Lentes deportivos' });

    await createCategory(validInput(), actor);

    expect(createCategoryRow).toHaveBeenCalledWith(expect.objectContaining({ slug: 'lentes-deportivos-2' }));
  });

  it('rejects malformed capabilities at write time instead of persisting them', async () => {
    await expect(createCategory(validInput({ capabilities: { allowsLensType: 'yes-please' } }), actor)).rejects.toThrow(
      ValidationError
    );
    expect(createCategoryRow).not.toHaveBeenCalled();
    expect(recordAudit).not.toHaveBeenCalled();
  });
});

describe('modules/catalog/category-service — updateCategory', () => {
  afterEach(() => vi.clearAllMocks());

  it('rejects when the category no longer exists', async () => {
    findCategoryById.mockResolvedValue(null);

    await expect(updateCategory('cat_missing', validInput(), actor)).rejects.toThrow(ValidationError);
    expect(updateCategoryRow).not.toHaveBeenCalled();
  });

  it('never touches the existing slug, and audits category.updated', async () => {
    findCategoryById.mockResolvedValue({ id: 'cat_1', slug: 'armazones' });
    updateCategoryRow.mockResolvedValue({ id: 'cat_1', name: 'Armazones renombrados' });

    await updateCategory('cat_1', validInput({ name: 'Armazones renombrados' }), actor);

    const [, data] = updateCategoryRow.mock.calls[0];
    expect(data).not.toHaveProperty('slug');
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'category.updated', targetId: 'cat_1' }));
  });

  it('rejects malformed capabilities at write time instead of persisting them', async () => {
    findCategoryById.mockResolvedValue({ id: 'cat_1', slug: 'armazones' });

    await expect(updateCategory('cat_1', validInput({ capabilities: { allowsLensType: 'yes-please' } }), actor)).rejects.toThrow();
    expect(updateCategoryRow).not.toHaveBeenCalled();
  });
});

describe('modules/catalog/category-service — setCategoryActive', () => {
  afterEach(() => vi.clearAllMocks());

  it('audits category.enabled when activating', async () => {
    findCategoryById.mockResolvedValue({ id: 'cat_1', slug: 'armazones', name: 'Armazones' });
    setCategoryActiveRow.mockResolvedValue({ id: 'cat_1', active: true });

    await setCategoryActive('cat_1', true, actor);

    expect(setCategoryActiveRow).toHaveBeenCalledWith('cat_1', true);
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'category.enabled', targetId: 'cat_1' }));
  });

  it('audits category.disabled when deactivating', async () => {
    findCategoryById.mockResolvedValue({ id: 'cat_1', slug: 'armazones', name: 'Armazones' });
    setCategoryActiveRow.mockResolvedValue({ id: 'cat_1', active: false });

    await setCategoryActive('cat_1', false, actor);

    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'category.disabled', targetId: 'cat_1' }));
  });

  it('rejects when the category no longer exists', async () => {
    findCategoryById.mockResolvedValue(null);
    await expect(setCategoryActive('cat_missing', true, actor)).rejects.toThrow(ValidationError);
    expect(setCategoryActiveRow).not.toHaveBeenCalled();
  });
});

describe('modules/catalog/category-service — reorderCategories', () => {
  afterEach(() => vi.clearAllMocks());

  it('reorders when the id set matches exactly, and audits category.updated', async () => {
    listCategoriesForAdmin.mockResolvedValue([{ id: 'cat_1' }, { id: 'cat_2' }, { id: 'cat_3' }]);
    runInTransaction.mockImplementation((fn: (tx: unknown) => unknown) => fn({}));

    await reorderCategories(['cat_3', 'cat_1', 'cat_2'], actor);

    expect(reorderCategoryRows).toHaveBeenCalledWith({}, ['cat_3', 'cat_1', 'cat_2']);
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'category.updated', targetId: null }));
  });

  it('rejects when the provided id set does not match the current categories', async () => {
    listCategoriesForAdmin.mockResolvedValue([{ id: 'cat_1' }, { id: 'cat_2' }]);

    await expect(reorderCategories(['cat_1'], actor)).rejects.toThrow(ValidationError);
    expect(runInTransaction).not.toHaveBeenCalled();
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
