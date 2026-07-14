import { afterEach, describe, expect, it, vi } from 'vitest';
import { ValidationError } from '@/lib/errors';
import type { CurrentSession } from '@/modules/auth/service';

const findProductById = vi.fn();
const findProductColorById = vi.fn();
const createProductColorRow = vi.fn();
const deleteProductColorRow = vi.fn();
const countProductImagesByColorId = vi.fn();
const reassignAndDeleteColor = vi.fn();

vi.mock('@/modules/catalog/admin-repository', () => ({
  findProductById: (...args: unknown[]) => findProductById(...args),
  findProductColorById: (...args: unknown[]) => findProductColorById(...args),
  createProductColorRow: (...args: unknown[]) => createProductColorRow(...args),
  deleteProductColorRow: (...args: unknown[]) => deleteProductColorRow(...args),
  countProductImagesByColorId: (...args: unknown[]) => countProductImagesByColorId(...args),
  reassignAndDeleteColor: (...args: unknown[]) => reassignAndDeleteColor(...args),
  // Unused by this test file's calls, but imported by the module under test.
  countProductImages: vi.fn(),
  createProductImageRow: vi.fn(),
  createProductRow: vi.fn(),
  deleteProductImageRow: vi.fn(),
  deleteProductRow: vi.fn(),
  findBrandById: vi.fn(),
  findProductByCode: vi.fn(),
  findProductBySlugAny: vi.fn(),
  findProductImageById: vi.fn(),
  getMaxSortOrder: vi.fn(),
  getProductKpis: vi.fn(),
  listActiveBrandsForAdmin: vi.fn(),
  listProductImages: vi.fn(),
  listProductsForAdmin: vi.fn(),
  reorderProductImagesRows: vi.fn(),
  runInTransaction: vi.fn(),
  setCoverImageRows: vi.fn(),
  updateProductImageRow: vi.fn(),
  updateProductRow: vi.fn(),
}));

const recordAudit = vi.fn();

vi.mock('@/modules/auth/service', () => ({
  recordAudit: (...args: unknown[]) => recordAudit(...args),
}));

const { addProductColor, removeProductColor, reassignAndRemoveProductColor } = await import(
  '@/modules/catalog/admin-service'
);

const actor: CurrentSession = {
  sessionId: 'sess_1',
  adminUser: { id: 'admin_1', email: 'admin@pepivision360.cl', name: 'Admin', role: 'SUPERADMIN', active: true },
};

function productWithColors(count: number) {
  return { id: 'prod_1', colors: Array.from({ length: count }, (_, i) => ({ id: `color_${i}` })) };
}

describe('modules/catalog/admin-service — addProductColor', () => {
  afterEach(() => vi.clearAllMocks());

  it('creates the color and returns it with a real persisted id', async () => {
    findProductById.mockResolvedValue(productWithColors(1));
    createProductColorRow.mockResolvedValue({ id: 'color_new', productId: 'prod_1', name: 'Negro', hex: '#000000' });

    const color = await addProductColor('prod_1', { name: 'Negro', hex: '#000000' }, actor);

    expect(color).toEqual({ id: 'color_new', productId: 'prod_1', name: 'Negro', hex: '#000000' });
    expect(createProductColorRow).toHaveBeenCalledWith({ productId: 'prod_1', name: 'Negro', hex: '#000000' });
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'product.color_added' }));
  });

  it('rejects once the product already has the maximum number of colors', async () => {
    findProductById.mockResolvedValue(productWithColors(12));

    await expect(addProductColor('prod_1', { name: 'Azul', hex: '#0000ff' }, actor)).rejects.toThrow(ValidationError);
    expect(createProductColorRow).not.toHaveBeenCalled();
  });

  it('rejects when the product no longer exists', async () => {
    findProductById.mockResolvedValue(null);

    await expect(addProductColor('prod_missing', { name: 'Azul', hex: '#0000ff' }, actor)).rejects.toThrow(ValidationError);
  });
});

describe('modules/catalog/admin-service — removeProductColor', () => {
  afterEach(() => vi.clearAllMocks());

  it('deletes the color immediately when it has no associated photos', async () => {
    findProductColorById.mockResolvedValue({ id: 'color_1', productId: 'prod_1', name: 'Negro' });
    countProductImagesByColorId.mockResolvedValue(0);

    const result = await removeProductColor('prod_1', 'color_1', actor);

    expect(result).toEqual({ status: 'removed' });
    expect(deleteProductColorRow).toHaveBeenCalledWith('color_1');
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'product.color_removed' }));
  });

  it('blocks deletion (no silent delete) when the color still has photos', async () => {
    findProductColorById.mockResolvedValue({ id: 'color_1', productId: 'prod_1', name: 'Negro' });
    countProductImagesByColorId.mockResolvedValue(3);

    const result = await removeProductColor('prod_1', 'color_1', actor);

    expect(result).toEqual({ status: 'blocked', photoCount: 3 });
    expect(deleteProductColorRow).not.toHaveBeenCalled();
    expect(recordAudit).not.toHaveBeenCalled();
  });

  it('rejects when the color does not belong to the given product', async () => {
    findProductColorById.mockResolvedValue({ id: 'color_1', productId: 'other_product', name: 'Negro' });

    await expect(removeProductColor('prod_1', 'color_1', actor)).rejects.toThrow(ValidationError);
    expect(deleteProductColorRow).not.toHaveBeenCalled();
  });
});

describe('modules/catalog/admin-service — reassignAndRemoveProductColor', () => {
  afterEach(() => vi.clearAllMocks());

  it('reassigns photos to the destination color and deletes the source color', async () => {
    findProductColorById.mockImplementation(async (id: string) =>
      id === 'color_from' ? { id: 'color_from', productId: 'prod_1' } : { id: 'color_to', productId: 'prod_1' }
    );
    countProductImagesByColorId.mockResolvedValue(4);
    reassignAndDeleteColor.mockResolvedValue(undefined);

    const result = await reassignAndRemoveProductColor('prod_1', 'color_from', 'color_to', actor);

    expect(result).toEqual({ movedCount: 4 });
    expect(reassignAndDeleteColor).toHaveBeenCalledWith('prod_1', 'color_from', 'color_to');
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'product.color_reassigned_and_removed' }));
  });

  it('rejects when the source and destination color are the same', async () => {
    await expect(reassignAndRemoveProductColor('prod_1', 'color_1', 'color_1', actor)).rejects.toThrow(ValidationError);
    expect(reassignAndDeleteColor).not.toHaveBeenCalled();
  });

  it('rejects when the destination color does not belong to the product', async () => {
    findProductColorById.mockImplementation(async (id: string) =>
      id === 'color_from' ? { id: 'color_from', productId: 'prod_1' } : { id: 'color_to', productId: 'other_product' }
    );

    await expect(reassignAndRemoveProductColor('prod_1', 'color_from', 'color_to', actor)).rejects.toThrow(ValidationError);
    expect(reassignAndDeleteColor).not.toHaveBeenCalled();
  });
});
