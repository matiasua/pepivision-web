import { afterEach, describe, expect, it, vi } from 'vitest';
import { ValidationError } from '@/lib/errors';
import type { CurrentSession } from '@/modules/auth/service';

const findProductById = vi.fn();
vi.mock('@/modules/catalog/admin-repository', () => ({
  findProductById: (...args: unknown[]) => findProductById(...args),
}));

const findCategoryById = vi.fn();
vi.mock('@/modules/catalog/category-repository', () => ({
  findCategoryById: (...args: unknown[]) => findCategoryById(...args),
}));

const findOfferingById = vi.fn();
const findOfferingByProductAndCategory = vi.fn();
const findOfferingBySlugInCategoryAny = vi.fn();
const createOfferingRow = vi.fn();
const updateOfferingRow = vi.fn();
const softDeleteOfferingRow = vi.fn();
const setOfferingActiveRow = vi.fn();

vi.mock('@/modules/catalog/offering-repository', () => ({
  findOfferingById: (...args: unknown[]) => findOfferingById(...args),
  findOfferingByProductAndCategory: (...args: unknown[]) => findOfferingByProductAndCategory(...args),
  findOfferingBySlugInCategoryAny: (...args: unknown[]) => findOfferingBySlugInCategoryAny(...args),
  createOfferingRow: (...args: unknown[]) => createOfferingRow(...args),
  updateOfferingRow: (...args: unknown[]) => updateOfferingRow(...args),
  softDeleteOfferingRow: (...args: unknown[]) => softDeleteOfferingRow(...args),
  setOfferingActiveRow: (...args: unknown[]) => setOfferingActiveRow(...args),
  listOfferingsForProduct: vi.fn(),
  listPublicOfferingsForCategory: vi.fn(),
}));

const recordAudit = vi.fn();
vi.mock('@/modules/auth/service', () => ({
  recordAudit: (...args: unknown[]) => recordAudit(...args),
}));

const { createOffering, updateOffering, softDeleteOffering, setOfferingActive, verifyOfferingOwnership } = await import(
  '@/modules/catalog/offering-service'
);

const actor: CurrentSession = {
  sessionId: 'sess_1',
  adminUser: { id: 'admin_1', email: 'admin@pepivision360.cl', name: 'Admin', role: 'ADMIN', active: true },
};

function validInput(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    productId: 'prod_1',
    categoryId: 'cat_1',
    title: undefined,
    commercialDescription: undefined,
    priceFromClp: 19990,
    active: true,
    visible: true,
    featured: false,
    sortOrder: 0,
    seoTitle: undefined,
    seoDescription: undefined,
    ...overrides,
  } as never;
}

describe('modules/catalog/offering-service — createOffering', () => {
  afterEach(() => vi.clearAllMocks());

  it('derives the offering slug from the product slug, scoped to the category, and audits offering.created', async () => {
    findProductById.mockResolvedValue({ id: 'prod_1', slug: 'coral' });
    findCategoryById.mockResolvedValue({ id: 'cat_1' });
    findOfferingByProductAndCategory.mockResolvedValue(null);
    findOfferingBySlugInCategoryAny.mockResolvedValue(null);
    createOfferingRow.mockResolvedValue({ id: 'off_1', productId: 'prod_1', categoryId: 'cat_1' });

    await createOffering(validInput(), actor);

    expect(createOfferingRow).toHaveBeenCalledWith(expect.objectContaining({ slug: 'coral', productId: 'prod_1', categoryId: 'cat_1' }));
    expect(recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: 'admin_1', action: 'offering.created', targetType: 'ProductOffering', targetId: 'off_1' })
    );
  });

  it('appends a numeric suffix when the derived slug already exists in that category', async () => {
    findProductById.mockResolvedValue({ id: 'prod_1', slug: 'coral' });
    findCategoryById.mockResolvedValue({ id: 'cat_1' });
    findOfferingByProductAndCategory.mockResolvedValue(null);
    findOfferingBySlugInCategoryAny.mockImplementation(async (_categoryId: string, slug: string) =>
      slug === 'coral' ? { id: 'other' } : null
    );
    createOfferingRow.mockResolvedValue({ id: 'off_2', productId: 'prod_1', categoryId: 'cat_1' });

    await createOffering(validInput(), actor);

    expect(createOfferingRow).toHaveBeenCalledWith(expect.objectContaining({ slug: 'coral-2' }));
  });

  it('rejects when the product no longer exists', async () => {
    findProductById.mockResolvedValue(null);

    await expect(createOffering(validInput(), actor)).rejects.toThrow(ValidationError);
    expect(createOfferingRow).not.toHaveBeenCalled();
    expect(recordAudit).not.toHaveBeenCalled();
  });

  it('rejects when the category no longer exists', async () => {
    findProductById.mockResolvedValue({ id: 'prod_1', slug: 'coral' });
    findCategoryById.mockResolvedValue(null);

    await expect(createOffering(validInput(), actor)).rejects.toThrow(ValidationError);
    expect(createOfferingRow).not.toHaveBeenCalled();
  });

  it('rejects a duplicate (productId, categoryId) at the service level, with a friendly message', async () => {
    findProductById.mockResolvedValue({ id: 'prod_1', slug: 'coral' });
    findCategoryById.mockResolvedValue({ id: 'cat_1' });
    findOfferingByProductAndCategory.mockResolvedValue({ id: 'existing_offering' });

    await expect(createOffering(validInput(), actor)).rejects.toThrow(ValidationError);
    expect(createOfferingRow).not.toHaveBeenCalled();
  });
});

describe('modules/catalog/offering-service — updateOffering / softDeleteOffering', () => {
  afterEach(() => vi.clearAllMocks());

  it('rejects updating an offering that no longer exists', async () => {
    findOfferingById.mockResolvedValue(null);
    await expect(updateOffering('off_missing', validInput(), actor)).rejects.toThrow(ValidationError);
    expect(updateOfferingRow).not.toHaveBeenCalled();
  });

  it('never includes productId/categoryId/slug in the update payload, and audits offering.updated', async () => {
    findOfferingById.mockResolvedValue({ id: 'off_1', productId: 'prod_1', categoryId: 'cat_1' });
    updateOfferingRow.mockResolvedValue({ id: 'off_1' });

    await updateOffering('off_1', validInput(), actor);

    const [, data] = updateOfferingRow.mock.calls[0];
    expect(data).not.toHaveProperty('productId');
    expect(data).not.toHaveProperty('categoryId');
    expect(data).not.toHaveProperty('slug');
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'offering.updated', targetId: 'off_1' }));
  });

  it('rejects soft-deleting an offering that no longer exists', async () => {
    findOfferingById.mockResolvedValue(null);
    await expect(softDeleteOffering('off_missing')).rejects.toThrow(ValidationError);
    expect(softDeleteOfferingRow).not.toHaveBeenCalled();
  });
});

describe('modules/catalog/offering-service — setOfferingActive', () => {
  afterEach(() => vi.clearAllMocks());

  it('audits offering.enabled when activating', async () => {
    findOfferingById.mockResolvedValue({ id: 'off_1', productId: 'prod_1', categoryId: 'cat_1' });
    setOfferingActiveRow.mockResolvedValue({ id: 'off_1', active: true });

    await setOfferingActive('off_1', true, actor);

    expect(setOfferingActiveRow).toHaveBeenCalledWith('off_1', true);
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'offering.enabled', targetId: 'off_1' }));
  });

  it('audits offering.disabled when deactivating', async () => {
    findOfferingById.mockResolvedValue({ id: 'off_1', productId: 'prod_1', categoryId: 'cat_1' });
    setOfferingActiveRow.mockResolvedValue({ id: 'off_1', active: false });

    await setOfferingActive('off_1', false, actor);

    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'offering.disabled', targetId: 'off_1' }));
  });

  it('rejects when the offering no longer exists', async () => {
    findOfferingById.mockResolvedValue(null);
    await expect(setOfferingActive('off_missing', true, actor)).rejects.toThrow(ValidationError);
    expect(setOfferingActiveRow).not.toHaveBeenCalled();
  });
});

describe('modules/catalog/offering-service — verifyOfferingOwnership (3.2)', () => {
  afterEach(() => vi.clearAllMocks());

  it('resolves with the offering when category and product both match', async () => {
    findOfferingById.mockResolvedValue({ id: 'off_1', categoryId: 'cat_1', productId: 'prod_1' });

    await expect(verifyOfferingOwnership('off_1', 'cat_1', 'prod_1')).resolves.toMatchObject({ id: 'off_1' });
  });

  it('rejects when the offering belongs to a different category', async () => {
    findOfferingById.mockResolvedValue({ id: 'off_1', categoryId: 'cat_other', productId: 'prod_1' });

    await expect(verifyOfferingOwnership('off_1', 'cat_1', 'prod_1')).rejects.toThrow(ValidationError);
  });

  it('rejects when the offering belongs to a different product', async () => {
    findOfferingById.mockResolvedValue({ id: 'off_1', categoryId: 'cat_1', productId: 'prod_other' });

    await expect(verifyOfferingOwnership('off_1', 'cat_1', 'prod_1')).rejects.toThrow(ValidationError);
  });

  it('rejects when the offering does not exist at all', async () => {
    findOfferingById.mockResolvedValue(null);

    await expect(verifyOfferingOwnership('off_missing', 'cat_1', 'prod_1')).rejects.toThrow(ValidationError);
  });
});
