import { afterEach, describe, expect, it, vi } from 'vitest';
import { ValidationError } from '@/lib/errors';
import type { CurrentSession } from '@/modules/auth/service';

const findCategoryById = vi.fn();
vi.mock('@/modules/catalog/category-repository', () => ({
  findCategoryById: (...args: unknown[]) => findCategoryById(...args),
}));

const findAttributeById = vi.fn();
const findAttributeByCategoryAndKey = vi.fn();
const createAttributeRow = vi.fn();
const updateAttributeRow = vi.fn();
const deleteAttributeRow = vi.fn();

vi.mock('@/modules/catalog/category-attribute-repository', () => ({
  findAttributeById: (...args: unknown[]) => findAttributeById(...args),
  findAttributeByCategoryAndKey: (...args: unknown[]) => findAttributeByCategoryAndKey(...args),
  createAttributeRow: (...args: unknown[]) => createAttributeRow(...args),
  updateAttributeRow: (...args: unknown[]) => updateAttributeRow(...args),
  deleteAttributeRow: (...args: unknown[]) => deleteAttributeRow(...args),
  listAttributesForCategory: vi.fn(),
}));

const recordAudit = vi.fn();
vi.mock('@/modules/auth/service', () => ({
  recordAudit: (...args: unknown[]) => recordAudit(...args),
}));

const { createAttribute, updateAttribute, deleteAttribute } = await import('@/modules/catalog/category-attribute-service');

const actor: CurrentSession = {
  sessionId: 'sess_1',
  adminUser: { id: 'admin_1', email: 'admin@pepivision360.cl', name: 'Admin', role: 'SUPERADMIN', active: true },
};

function validInput(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    categoryId: 'cat_1',
    key: 'certificacion',
    label: 'Certificación',
    type: 'SELECT',
    required: false,
    filterable: true,
    visibleInCard: false,
    visibleInDetail: true,
    sortOrder: 0,
    options: ['CE', 'ANSI'],
    active: true,
    ...overrides,
  } as never;
}

describe('modules/catalog/category-attribute-service — createAttribute', () => {
  afterEach(() => vi.clearAllMocks());

  it('creates the attribute and audits category.attributes_updated', async () => {
    findCategoryById.mockResolvedValue({ id: 'cat_1' });
    findAttributeByCategoryAndKey.mockResolvedValue(null);
    createAttributeRow.mockResolvedValue({ id: 'attr_1', key: 'certificacion', categoryId: 'cat_1' });

    await createAttribute(validInput(), actor);

    expect(createAttributeRow).toHaveBeenCalledWith('cat_1', expect.objectContaining({ key: 'certificacion' }));
    expect(recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: 'admin_1', action: 'category.attributes_updated', targetType: 'Category', targetId: 'cat_1' })
    );
  });

  it('rejects when the category no longer exists', async () => {
    findCategoryById.mockResolvedValue(null);
    await expect(createAttribute(validInput(), actor)).rejects.toThrow(ValidationError);
    expect(createAttributeRow).not.toHaveBeenCalled();
  });

  it('rejects a duplicate key within the same category', async () => {
    findCategoryById.mockResolvedValue({ id: 'cat_1' });
    findAttributeByCategoryAndKey.mockResolvedValue({ id: 'existing_attr' });

    await expect(createAttribute(validInput(), actor)).rejects.toThrow(ValidationError);
    expect(createAttributeRow).not.toHaveBeenCalled();
  });
});

describe('modules/catalog/category-attribute-service — updateAttribute / deleteAttribute', () => {
  afterEach(() => vi.clearAllMocks());

  it('rejects updating an attribute that no longer exists', async () => {
    findAttributeById.mockResolvedValue(null);
    await expect(updateAttribute('attr_missing', validInput(), actor)).rejects.toThrow(ValidationError);
    expect(updateAttributeRow).not.toHaveBeenCalled();
  });

  it('never includes key in the update payload, and audits category.attributes_updated', async () => {
    findAttributeById.mockResolvedValue({ id: 'attr_1', categoryId: 'cat_1', key: 'certificacion' });
    updateAttributeRow.mockResolvedValue({ id: 'attr_1' });

    await updateAttribute('attr_1', validInput({ label: 'Certificación (editada)' }), actor);

    const [, data] = updateAttributeRow.mock.calls[0];
    expect(data).not.toHaveProperty('key');
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'category.attributes_updated', targetId: 'cat_1' }));
  });

  it('rejects deleting an attribute that no longer exists', async () => {
    findAttributeById.mockResolvedValue(null);
    await expect(deleteAttribute('attr_missing', actor)).rejects.toThrow(ValidationError);
    expect(deleteAttributeRow).not.toHaveBeenCalled();
  });

  it('deletes the attribute and audits category.attributes_updated', async () => {
    findAttributeById.mockResolvedValue({ id: 'attr_1', categoryId: 'cat_1', key: 'certificacion' });

    await deleteAttribute('attr_1', actor);

    expect(deleteAttributeRow).toHaveBeenCalledWith('attr_1');
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'category.attributes_updated', targetId: 'cat_1' }));
  });
});
