// Cubre Fase 4, tarea 4.5: un ADMIN no puede alterar la estructura de
// categorías, pero sí puede administrar ofertas. La autorización real vive
// en la capa de Server Actions (requireRole('SUPERADMIN') vs
// requireSession()), no en modules/catalog/*-service.ts — ver
// design.md → "Autorización". Este test verifica exactamente ese punto de
// aplicación, con la capa de dominio mockeada (no ejercita Postgres).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ForbiddenError } from '@/lib/errors';

const requireRole = vi.fn();
const requireSession = vi.fn();
const recordAudit = vi.fn();

vi.mock('@/modules/auth/service', () => ({
  requireRole: (...args: unknown[]) => requireRole(...args),
  requireSession: (...args: unknown[]) => requireSession(...args),
  recordAudit: (...args: unknown[]) => recordAudit(...args),
}));

vi.mock('@/modules/catalog/category-service', () => ({
  createCategory: vi.fn().mockResolvedValue({ id: 'cat_1' }),
  updateCategory: vi.fn().mockResolvedValue({ id: 'cat_1' }),
  deleteCategory: vi.fn().mockResolvedValue({ status: 'removed' }),
  setCategoryActive: vi.fn().mockResolvedValue({ id: 'cat_1' }),
  reorderCategories: vi.fn().mockResolvedValue(undefined),
  saveCategoryImage: vi.fn().mockResolvedValue({ id: 'cat_1', imagePath: 'https://storage.test/x.webp' }),
  deleteCategoryImage: vi.fn().mockResolvedValue({ id: 'cat_1', imagePath: null }),
}));

vi.mock('@/modules/catalog/category-attribute-service', () => ({
  createAttribute: vi.fn().mockResolvedValue({ id: 'attr_1' }),
  updateAttribute: vi.fn().mockResolvedValue({ id: 'attr_1' }),
  deleteAttribute: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/modules/catalog/offering-service', () => ({
  createOffering: vi.fn().mockResolvedValue({ id: 'off_1', categoryId: 'cat_1' }),
  updateOffering: vi.fn().mockResolvedValue({ id: 'off_1', categoryId: 'cat_1' }),
  setOfferingActive: vi.fn().mockResolvedValue({ id: 'off_1' }),
}));

const {
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
  setCategoryActiveAction,
  reorderCategoriesAction,
  uploadCategoryImageAction,
  deleteCategoryImageAction,
} = await import('@/app/admin/categories/actions');
const { createOfferingAction, updateOfferingAction, setOfferingActiveAction } = await import('@/app/admin/products/actions');

const SUPERADMIN_SESSION = {
  sessionId: 'sess_1',
  adminUser: { id: 'admin_1', email: 'superadmin@pepivision360.cl', name: 'Super', role: 'SUPERADMIN', active: true },
};

const ADMIN_SESSION = {
  sessionId: 'sess_2',
  adminUser: { id: 'admin_2', email: 'admin@pepivision360.cl', name: 'Admin', role: 'ADMIN', active: true },
};

const validCategoryInput = {
  name: 'Lentes deportivos',
  shortDescription: undefined,
  description: undefined,
  active: true,
  visible: true,
  sortOrder: 0,
  icon: undefined,
  seoTitle: undefined,
  seoDescription: undefined,
  capabilities: {
    requiresColor: true,
    allowsLensType: false,
    allowsTreatments: false,
    allowsPrescription: false,
    allowsPrescriptionAttachment: false,
    allowsLensTint: false,
    allowsFrameSelection: true,
  },
};

const validOfferingInput = {
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
};

describe('app/admin/categories/actions — category structure requires SUPERADMIN', () => {
  afterEach(() => vi.clearAllMocks());

  it('createCategoryAction calls requireRole("SUPERADMIN"), not requireSession', async () => {
    requireRole.mockResolvedValue(SUPERADMIN_SESSION);
    await createCategoryAction(validCategoryInput);
    expect(requireRole).toHaveBeenCalledWith('SUPERADMIN');
    expect(requireSession).not.toHaveBeenCalled();
  });

  it('propagates rejection when requireRole denies an ADMIN', async () => {
    requireRole.mockRejectedValue(new ForbiddenError('No tienes permiso para realizar esta acción.'));
    await expect(createCategoryAction(validCategoryInput)).rejects.toThrow(ForbiddenError);
  });

  it('updateCategoryAction, deleteCategoryAction, setCategoryActiveAction and reorderCategoriesAction all gate on SUPERADMIN', async () => {
    requireRole.mockResolvedValue(SUPERADMIN_SESSION);

    await updateCategoryAction('cat_1', validCategoryInput);
    await deleteCategoryAction('cat_1');
    await setCategoryActiveAction('cat_1', false);
    await reorderCategoriesAction(['cat_1', 'cat_2']);

    expect(requireRole).toHaveBeenCalledTimes(4);
    expect(requireRole).toHaveBeenCalledWith('SUPERADMIN');
    expect(requireSession).not.toHaveBeenCalled();
  });

  // Fase 6: la imagen de categoría es parte de la estructura de categoría
  // (design.md → "Autorización"), no mercadeo rutinario de oferta — misma
  // palanca SUPERADMIN-only que el resto de este describe.
  it('uploadCategoryImageAction gates on SUPERADMIN and never invokes requireSession', async () => {
    requireRole.mockResolvedValue(SUPERADMIN_SESSION);
    const formData = new FormData();
    formData.set('file', new File([Buffer.from('fake')], 'cover.jpg', { type: 'image/jpeg' }));

    const result = await uploadCategoryImageAction('cat_1', formData);

    expect(requireRole).toHaveBeenCalledWith('SUPERADMIN');
    expect(requireSession).not.toHaveBeenCalled();
    expect(result.status).toBe('success');
  });

  it('uploadCategoryImageAction rejects when requireRole denies an ADMIN (not SUPERADMIN)', async () => {
    requireRole.mockRejectedValue(new ForbiddenError('No tienes permiso para realizar esta acción.'));
    const formData = new FormData();
    formData.set('file', new File([Buffer.from('fake')], 'cover.jpg', { type: 'image/jpeg' }));

    await expect(uploadCategoryImageAction('cat_1', formData)).rejects.toThrow(ForbiddenError);
  });

  it('uploadCategoryImageAction rejects a call with no file, without ever calling the service', async () => {
    requireRole.mockResolvedValue(SUPERADMIN_SESSION);
    const result = await uploadCategoryImageAction('cat_1', new FormData());
    expect(result.status).toBe('error');
  });

  it('deleteCategoryImageAction gates on SUPERADMIN', async () => {
    requireRole.mockResolvedValue(SUPERADMIN_SESSION);
    const result = await deleteCategoryImageAction('cat_1');
    expect(requireRole).toHaveBeenCalledWith('SUPERADMIN');
    expect(requireSession).not.toHaveBeenCalled();
    expect(result.status).toBe('success');
  });

  it('deleteCategoryImageAction rejects when requireRole denies an ADMIN', async () => {
    requireRole.mockRejectedValue(new ForbiddenError('No tienes permiso para realizar esta acción.'));
    await expect(deleteCategoryImageAction('cat_1')).rejects.toThrow(ForbiddenError);
  });
});

describe('app/admin/products/actions — offering management permits ADMIN', () => {
  afterEach(() => vi.clearAllMocks());

  it('createOfferingAction calls requireSession (not requireRole), and succeeds for an ADMIN session', async () => {
    requireSession.mockResolvedValue(ADMIN_SESSION);

    const result = await createOfferingAction(validOfferingInput);

    expect(requireRole).not.toHaveBeenCalled();
    expect(requireSession).toHaveBeenCalled();
    expect(result.status).toBe('success');
  });

  it('updateOfferingAction and setOfferingActiveAction also only require an active session, no role restriction', async () => {
    requireSession.mockResolvedValue(ADMIN_SESSION);

    const updateResult = await updateOfferingAction('off_1', validOfferingInput);
    const toggleResult = await setOfferingActiveAction('off_1', false);

    expect(requireRole).not.toHaveBeenCalled();
    expect(updateResult.status).toBe('success');
    expect(toggleResult.status).toBe('success');
  });
});
