import { afterEach, describe, expect, it, vi } from 'vitest';
import { ValidationError } from '@/lib/errors';
import type { CurrentSession } from '@/modules/auth/service';

// Fase 6 (redesign-extensible-catalog-v2, design.md → "Imágenes de
// categoría"): saveCategoryImage()/deleteCategoryImage(), mocked
// prisma/storage — el pipeline de Sharp real se cubre en
// tests/image-processing.test.ts; aquí se cubre la orquestación (orden
// seguro de reemplazo, compensación, auditoría, idempotencia del borrado).
const findCategoryById = vi.fn();
const updateCategoryImageFields = vi.fn();

vi.mock('@/modules/catalog/category-repository', () => ({
  findCategoryById: (...args: unknown[]) => findCategoryById(...args),
  updateCategoryImageFields: (...args: unknown[]) => updateCategoryImageFields(...args),
  findCategoryBySlugAny: vi.fn(),
  createCategoryRow: vi.fn(),
  updateCategoryRow: vi.fn(),
  deleteCategoryRow: vi.fn(),
  countCategoryOfferings: vi.fn(),
  setCategoryActiveRow: vi.fn(),
  listCategoriesForAdmin: vi.fn(),
  listActiveCategoriesForAdmin: vi.fn(),
  runInTransaction: vi.fn(),
  reorderCategoryRows: vi.fn(),
  listActiveVisibleCategories: vi.fn(),
  findCategoryBySlug: vi.fn(),
}));

const recordAudit = vi.fn();
vi.mock('@/modules/auth/service', () => ({
  recordAudit: (...args: unknown[]) => recordAudit(...args),
}));

const uploadObject = vi.fn();
const deleteObject = vi.fn();
vi.mock('@/modules/storage/service', () => ({
  buildCategoryStorageKey: (categoryId: string, extension: string) => `categories/${categoryId}/cover-fixed.${extension}`,
  buildPublicUrl: (key: string) => `https://storage.test/${key}`,
  uploadObject: (...args: unknown[]) => uploadObject(...args),
  deleteObject: (...args: unknown[]) => deleteObject(...args),
}));

const processCategoryImage = vi.fn();
vi.mock('@/lib/image-processing', () => ({
  processCategoryImage: (...args: unknown[]) => processCategoryImage(...args),
}));

const { saveCategoryImage, deleteCategoryImage } = await import('@/modules/catalog/category-service');

const actor: CurrentSession = {
  sessionId: 'sess_1',
  adminUser: { id: 'admin_1', email: 'admin@pepivision360.cl', name: 'Admin', role: 'SUPERADMIN', active: true },
};

const CATEGORY_NO_IMAGE = { id: 'cat_1', slug: 'lentes-de-sol', name: 'Lentes de sol', imageStorageKey: null };
const CATEGORY_WITH_IMAGE = {
  id: 'cat_1',
  slug: 'lentes-de-sol',
  name: 'Lentes de sol',
  imageStorageKey: 'categories/cat_1/cover-old.webp',
};

const VALID_FILE = { buffer: Buffer.from('fake-image-bytes'), contentType: 'image/jpeg', size: 1024 };
const PROCESSED = { buffer: Buffer.from('processed'), contentType: 'image/webp', extension: 'webp', width: 800, height: 450 };

describe('modules/catalog/category-service — saveCategoryImage', () => {
  afterEach(() => vi.clearAllMocks());

  it('rejects when the category no longer exists', async () => {
    findCategoryById.mockResolvedValue(null);
    await expect(saveCategoryImage('cat_missing', VALID_FILE, actor)).rejects.toThrow(ValidationError);
    expect(uploadObject).not.toHaveBeenCalled();
  });

  it('rejects an oversized file before processing/uploading anything', async () => {
    findCategoryById.mockResolvedValue(CATEGORY_NO_IMAGE);
    await expect(saveCategoryImage('cat_1', { ...VALID_FILE, size: 20 * 1024 * 1024 }, actor)).rejects.toThrow(ValidationError);
    expect(processCategoryImage).not.toHaveBeenCalled();
    expect(uploadObject).not.toHaveBeenCalled();
  });

  it('rejects a disallowed MIME type (e.g. SVG) before processing/uploading anything', async () => {
    findCategoryById.mockResolvedValue(CATEGORY_NO_IMAGE);
    await expect(saveCategoryImage('cat_1', { ...VALID_FILE, contentType: 'image/svg+xml' }, actor)).rejects.toThrow(ValidationError);
    expect(processCategoryImage).not.toHaveBeenCalled();
  });

  it('uploads a category with no previous image (first upload), no old object to clean up', async () => {
    findCategoryById.mockResolvedValue(CATEGORY_NO_IMAGE);
    processCategoryImage.mockResolvedValue(PROCESSED);
    updateCategoryImageFields.mockResolvedValue({ ...CATEGORY_NO_IMAGE, imagePath: 'https://storage.test/x', imageStorageKey: 'x' });

    const result = await saveCategoryImage('cat_1', VALID_FILE, actor);

    expect(uploadObject).toHaveBeenCalledTimes(1);
    expect(updateCategoryImageFields).toHaveBeenCalledWith('cat_1', {
      imagePath: 'https://storage.test/categories/cat_1/cover-fixed.webp',
      imageStorageKey: 'categories/cat_1/cover-fixed.webp',
    });
    expect(deleteObject).not.toHaveBeenCalled(); // nada que limpiar
    expect(recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'category.updated', targetId: 'cat_1', metadata: expect.objectContaining({ imageAction: 'uploaded' }) })
    );
    expect(result).toBeDefined();
  });

  it('replaces an existing image: uploads new, persists, THEN deletes the old object (never before)', async () => {
    findCategoryById.mockResolvedValue(CATEGORY_WITH_IMAGE);
    processCategoryImage.mockResolvedValue(PROCESSED);
    updateCategoryImageFields.mockResolvedValue({ ...CATEGORY_WITH_IMAGE, imageStorageKey: 'categories/cat_1/cover-fixed.webp' });

    const callOrder: string[] = [];
    uploadObject.mockImplementation(async () => { callOrder.push('upload'); });
    updateCategoryImageFields.mockImplementation(async () => { callOrder.push('persist'); return CATEGORY_WITH_IMAGE; });
    deleteObject.mockImplementation(async () => { callOrder.push('delete-old'); });

    await saveCategoryImage('cat_1', VALID_FILE, actor);

    expect(callOrder).toEqual(['upload', 'persist', 'delete-old']);
    expect(deleteObject).toHaveBeenCalledWith('categories/cat_1/cover-old.webp');
    expect(recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: expect.objectContaining({ imageAction: 'replaced' }) })
    );
  });

  it('compensates (deletes the new object) when persisting to the database fails, and never leaves a broken reference', async () => {
    findCategoryById.mockResolvedValue(CATEGORY_NO_IMAGE);
    processCategoryImage.mockResolvedValue(PROCESSED);
    updateCategoryImageFields.mockRejectedValue(new Error('db down'));

    await expect(saveCategoryImage('cat_1', VALID_FILE, actor)).rejects.toThrow(ValidationError);

    expect(uploadObject).toHaveBeenCalledTimes(1);
    expect(deleteObject).toHaveBeenCalledWith('categories/cat_1/cover-fixed.webp'); // compensación del objeto nuevo
    expect(recordAudit).not.toHaveBeenCalled(); // nunca audita una operación que falló
  });

  it('surfaces a safe validation error (never the raw storage error) when the upload itself fails', async () => {
    findCategoryById.mockResolvedValue(CATEGORY_NO_IMAGE);
    processCategoryImage.mockResolvedValue(PROCESSED);
    uploadObject.mockRejectedValue(new Error('S3 connection refused at 10.0.0.5:9000'));

    await expect(saveCategoryImage('cat_1', VALID_FILE, actor)).rejects.toThrow(ValidationError);
    await expect(saveCategoryImage('cat_1', VALID_FILE, actor)).rejects.not.toThrow(/10\.0\.0\.5/);
    expect(updateCategoryImageFields).not.toHaveBeenCalled();
  });

  it('rejects a corrupted file that fails processing, before ever uploading', async () => {
    findCategoryById.mockResolvedValue(CATEGORY_NO_IMAGE);
    processCategoryImage.mockRejectedValue(new Error('Input buffer contains unsupported image format'));

    await expect(saveCategoryImage('cat_1', VALID_FILE, actor)).rejects.toThrow(ValidationError);
    expect(uploadObject).not.toHaveBeenCalled();
  });
});

describe('modules/catalog/category-service — deleteCategoryImage', () => {
  afterEach(() => vi.clearAllMocks());

  it('rejects when the category no longer exists', async () => {
    findCategoryById.mockResolvedValue(null);
    await expect(deleteCategoryImage('cat_missing', actor)).rejects.toThrow(ValidationError);
  });

  it('is idempotent — a category with no image is a safe no-op, not an error', async () => {
    findCategoryById.mockResolvedValue(CATEGORY_NO_IMAGE);
    const result = await deleteCategoryImage('cat_1', actor);
    expect(result).toBe(CATEGORY_NO_IMAGE);
    expect(updateCategoryImageFields).not.toHaveBeenCalled();
    expect(deleteObject).not.toHaveBeenCalled();
    expect(recordAudit).not.toHaveBeenCalled();
  });

  it('clears the DB reference first, then deletes the storage object — using the key from the persisted row, not client input', async () => {
    findCategoryById.mockResolvedValue(CATEGORY_WITH_IMAGE);
    updateCategoryImageFields.mockResolvedValue({ ...CATEGORY_WITH_IMAGE, imagePath: null, imageStorageKey: null });

    const callOrder: string[] = [];
    updateCategoryImageFields.mockImplementation(async () => {
      callOrder.push('clear-db');
      return { ...CATEGORY_WITH_IMAGE, imagePath: null, imageStorageKey: null };
    });
    deleteObject.mockImplementation(async () => { callOrder.push('delete-object'); });

    await deleteCategoryImage('cat_1', actor);

    expect(callOrder).toEqual(['clear-db', 'delete-object']);
    expect(updateCategoryImageFields).toHaveBeenCalledWith('cat_1', { imagePath: null, imageStorageKey: null });
    expect(deleteObject).toHaveBeenCalledWith('categories/cat_1/cover-old.webp');
    expect(recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'category.updated', metadata: expect.objectContaining({ imageAction: 'removed' }) })
    );
  });

  it('does not throw even if deleting the storage object fails — the DB is already the authoritative, cleared state', async () => {
    findCategoryById.mockResolvedValue(CATEGORY_WITH_IMAGE);
    updateCategoryImageFields.mockResolvedValue({ ...CATEGORY_WITH_IMAGE, imagePath: null, imageStorageKey: null });
    deleteObject.mockRejectedValue(new Error('object not found'));

    await expect(deleteCategoryImage('cat_1', actor)).resolves.toBeDefined();
  });
});
