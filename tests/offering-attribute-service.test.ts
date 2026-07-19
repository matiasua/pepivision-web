import { afterEach, describe, expect, it, vi } from 'vitest';
import { ValidationError } from '@/lib/errors';
import type { CurrentSession } from '@/modules/auth/service';

const findOfferingById = vi.fn();
vi.mock('@/modules/catalog/offering-repository', () => ({
  findOfferingById: (...args: unknown[]) => findOfferingById(...args),
}));

const listAttributeDefinitionsForCategory = vi.fn();
const listAttributeValuesForOffering = vi.fn();
const replaceOfferingAttributeValues = vi.fn();
vi.mock('@/modules/catalog/offering-attribute-repository', () => ({
  listAttributeDefinitionsForCategory: (...args: unknown[]) => listAttributeDefinitionsForCategory(...args),
  listAttributeValuesForOffering: (...args: unknown[]) => listAttributeValuesForOffering(...args),
  replaceOfferingAttributeValues: (...args: unknown[]) => replaceOfferingAttributeValues(...args),
}));

const recordAudit = vi.fn();
vi.mock('@/modules/auth/service', () => ({
  recordAudit: (...args: unknown[]) => recordAudit(...args),
}));

const { getOfferingAttributeContext, updateOfferingAttributeValues } = await import(
  '@/modules/catalog/offering-attribute-service'
);

const actor: CurrentSession = {
  sessionId: 'sess_1',
  adminUser: { id: 'admin_1', email: 'admin@pepivision360.cl', name: 'Admin', role: 'ADMIN', active: true },
};

const OFFERING = { id: 'off_1', categoryId: 'cat_1', productId: 'prod_1' };

const SELECT_DEF = {
  id: 'def_select',
  key: 'material',
  label: 'Material',
  type: 'SELECT',
  options: ['Acetato', 'Metal'],
  active: true,
  filterable: true,
  sortOrder: 0,
};
const MULTI_DEF = {
  id: 'def_multi',
  key: 'colores_disponibles',
  label: 'Colores disponibles',
  type: 'MULTI_SELECT',
  options: ['Negro', 'Café', 'Azul'],
  active: true,
  filterable: true,
  sortOrder: 1,
};
const BOOLEAN_DEF = {
  id: 'def_bool',
  key: 'polarizado',
  label: 'Polarizado',
  type: 'BOOLEAN',
  options: null,
  active: true,
  filterable: true,
  sortOrder: 2,
};
const RANGE_DEF = {
  id: 'def_range',
  key: 'diametro',
  label: 'Diámetro',
  type: 'RANGE',
  options: null,
  active: true,
  filterable: true,
  sortOrder: 3,
};
const TEXT_DEF = {
  id: 'def_text',
  key: 'nota_interna',
  label: 'Nota interna',
  type: 'TEXT',
  options: null,
  active: true,
  filterable: false,
  sortOrder: 4,
};

const ALL_DEFS = [SELECT_DEF, MULTI_DEF, BOOLEAN_DEF, RANGE_DEF, TEXT_DEF];

function entry(attributeDefinitionId: string, overrides: Record<string, unknown> = {}) {
  return {
    attributeDefinitionId,
    textValue: null,
    multiValues: null,
    numberValue: null,
    booleanValue: null,
    ...overrides,
  };
}

describe('modules/catalog/offering-attribute-service — getOfferingAttributeContext', () => {
  afterEach(() => vi.clearAllMocks());

  it('rejects when the offering no longer exists', async () => {
    findOfferingById.mockResolvedValue(null);
    await expect(getOfferingAttributeContext('off_missing')).rejects.toThrow(ValidationError);
  });

  it('decodes a MULTI_SELECT JSON-serialized valueText into an array', async () => {
    findOfferingById.mockResolvedValue(OFFERING);
    listAttributeDefinitionsForCategory.mockResolvedValue([MULTI_DEF]);
    listAttributeValuesForOffering.mockResolvedValue([
      { attributeDefinitionId: 'def_multi', valueText: JSON.stringify(['Azul', 'Negro']), valueNumber: null, valueBoolean: null },
    ]);

    const context = await getOfferingAttributeContext('off_1');

    expect(context.values[0]).toEqual(
      expect.objectContaining({ attributeDefinitionId: 'def_multi', multiValues: ['Azul', 'Negro'] })
    );
  });

  it('fails closed to an empty array on corrupt MULTI_SELECT JSON, never throws', async () => {
    findOfferingById.mockResolvedValue(OFFERING);
    listAttributeDefinitionsForCategory.mockResolvedValue([MULTI_DEF]);
    listAttributeValuesForOffering.mockResolvedValue([
      { attributeDefinitionId: 'def_multi', valueText: '{not-json', valueNumber: null, valueBoolean: null },
    ]);

    const context = await getOfferingAttributeContext('off_1');

    expect(context.values[0].multiValues).toBeNull();
  });

  it('represents an unset attribute as all-null, not absent', async () => {
    findOfferingById.mockResolvedValue(OFFERING);
    listAttributeDefinitionsForCategory.mockResolvedValue([SELECT_DEF]);
    listAttributeValuesForOffering.mockResolvedValue([]);

    const context = await getOfferingAttributeContext('off_1');

    expect(context.values[0]).toEqual({
      attributeDefinitionId: 'def_select',
      textValue: null,
      multiValues: null,
      numberValue: null,
      booleanValue: null,
    });
  });
});

describe('modules/catalog/offering-attribute-service — updateOfferingAttributeValues', () => {
  afterEach(() => vi.clearAllMocks());

  function setup() {
    findOfferingById.mockResolvedValue(OFFERING);
    listAttributeDefinitionsForCategory.mockResolvedValue(ALL_DEFS);
    replaceOfferingAttributeValues.mockResolvedValue([]);
    listAttributeValuesForOffering.mockResolvedValue([]);
  }

  it('rejects when the offering no longer exists', async () => {
    findOfferingById.mockResolvedValue(null);
    await expect(updateOfferingAttributeValues({ offeringId: 'off_missing', values: [] }, actor)).rejects.toThrow(
      ValidationError
    );
    expect(replaceOfferingAttributeValues).not.toHaveBeenCalled();
  });

  it('accepts a valid SELECT value and persists it as valueText', async () => {
    setup();
    await updateOfferingAttributeValues({ offeringId: 'off_1', values: [entry('def_select', { textValue: 'Acetato' })] }, actor);

    const [, writes] = replaceOfferingAttributeValues.mock.calls[0];
    expect(writes).toEqual([{ offeringId: 'off_1', attributeDefinitionId: 'def_select', valueText: 'Acetato', valueNumber: null, valueBoolean: null }]);
  });

  it('rejects a SELECT value outside the declared options', async () => {
    setup();
    await expect(
      updateOfferingAttributeValues({ offeringId: 'off_1', values: [entry('def_select', { textValue: 'Titanio' })] }, actor)
    ).rejects.toThrow(ValidationError);
    expect(replaceOfferingAttributeValues).not.toHaveBeenCalled();
  });

  it('normalizes MULTI_SELECT: dedupes and sorts before serializing to JSON', async () => {
    setup();
    await updateOfferingAttributeValues(
      { offeringId: 'off_1', values: [entry('def_multi', { multiValues: ['Negro', 'Azul', 'Negro'] })] },
      actor
    );

    const [, writes] = replaceOfferingAttributeValues.mock.calls[0];
    expect(writes[0].valueText).toBe(JSON.stringify(['Azul', 'Negro']));
  });

  it('rejects a MULTI_SELECT value outside the declared options', async () => {
    setup();
    await expect(
      updateOfferingAttributeValues({ offeringId: 'off_1', values: [entry('def_multi', { multiValues: ['Rojo'] })] }, actor)
    ).rejects.toThrow(ValidationError);
    expect(replaceOfferingAttributeValues).not.toHaveBeenCalled();
  });

  it('stores BOOLEAN false explicitly (distinct from absence)', async () => {
    setup();
    await updateOfferingAttributeValues({ offeringId: 'off_1', values: [entry('def_bool', { booleanValue: false })] }, actor);

    const [, writes, deletes] = replaceOfferingAttributeValues.mock.calls[0];
    expect(writes).toEqual([{ offeringId: 'off_1', attributeDefinitionId: 'def_bool', valueText: null, valueNumber: null, valueBoolean: false }]);
    expect(deletes).toEqual([]);
  });

  it('treats an absent/null BOOLEAN as an explicit removal, not false', async () => {
    setup();
    await updateOfferingAttributeValues({ offeringId: 'off_1', values: [entry('def_bool', { booleanValue: null })] }, actor);

    const [, writes, deletes] = replaceOfferingAttributeValues.mock.calls[0];
    expect(writes).toEqual([]);
    expect(deletes).toEqual(['def_bool']);
  });

  it('accepts a valid RANGE/NUMBER value as valueNumber', async () => {
    setup();
    await updateOfferingAttributeValues({ offeringId: 'off_1', values: [entry('def_range', { numberValue: 52 })] }, actor);

    const [, writes] = replaceOfferingAttributeValues.mock.calls[0];
    expect(writes).toEqual([{ offeringId: 'off_1', attributeDefinitionId: 'def_range', valueText: null, valueNumber: 52, valueBoolean: null }]);
  });

  it('rejects a definitionId that does not belong to the offering category', async () => {
    setup();
    await expect(
      updateOfferingAttributeValues({ offeringId: 'off_1', values: [entry('def_other_category', { textValue: 'x' })] }, actor)
    ).rejects.toThrow(ValidationError);
    expect(replaceOfferingAttributeValues).not.toHaveBeenCalled();
  });

  it('rejects a nonexistent attributeDefinitionId', async () => {
    setup();
    await expect(
      updateOfferingAttributeValues({ offeringId: 'off_1', values: [entry('def_missing', { textValue: 'x' })] }, actor)
    ).rejects.toThrow(ValidationError);
    expect(replaceOfferingAttributeValues).not.toHaveBeenCalled();
  });

  it('rejects duplicate attributeDefinitionId entries in the same payload', async () => {
    setup();
    await expect(
      updateOfferingAttributeValues(
        { offeringId: 'off_1', values: [entry('def_select', { textValue: 'Acetato' }), entry('def_select', { textValue: 'Metal' })] },
        actor
      )
    ).rejects.toThrow(ValidationError);
    expect(replaceOfferingAttributeValues).not.toHaveBeenCalled();
  });

  it('rejects a value shape that does not match the definition type (multiValues on a SELECT)', async () => {
    setup();
    await expect(
      updateOfferingAttributeValues({ offeringId: 'off_1', values: [entry('def_select', { multiValues: ['Acetato'] })] }, actor)
    ).rejects.toThrow(ValidationError);
    expect(replaceOfferingAttributeValues).not.toHaveBeenCalled();
  });

  it('rejects a numberValue sent for a TEXT attribute', async () => {
    setup();
    await expect(
      updateOfferingAttributeValues({ offeringId: 'off_1', values: [entry('def_text', { numberValue: 5 })] }, actor)
    ).rejects.toThrow(ValidationError);
    expect(replaceOfferingAttributeValues).not.toHaveBeenCalled();
  });

  it('accepts TEXT as informational-only free text', async () => {
    setup();
    await updateOfferingAttributeValues({ offeringId: 'off_1', values: [entry('def_text', { textValue: 'Stock limitado' })] }, actor);

    const [, writes] = replaceOfferingAttributeValues.mock.calls[0];
    expect(writes).toEqual([{ offeringId: 'off_1', attributeDefinitionId: 'def_text', valueText: 'Stock limitado', valueNumber: null, valueBoolean: null }]);
  });

  it('submitting an empty payload is a no-op edit (no writes, no deletes)', async () => {
    setup();
    await updateOfferingAttributeValues({ offeringId: 'off_1', values: [] }, actor);

    const [, writes, deletes] = replaceOfferingAttributeValues.mock.calls[0];
    expect(writes).toEqual([]);
    expect(deletes).toEqual([]);
  });

  it('an inactive definition can still be submitted (admin may retain/clear its value)', async () => {
    findOfferingById.mockResolvedValue(OFFERING);
    listAttributeDefinitionsForCategory.mockResolvedValue([{ ...SELECT_DEF, active: false }]);
    replaceOfferingAttributeValues.mockResolvedValue([]);
    listAttributeValuesForOffering.mockResolvedValue([]);

    await updateOfferingAttributeValues({ offeringId: 'off_1', values: [entry('def_select', { textValue: null })] }, actor);

    const [, writes, deletes] = replaceOfferingAttributeValues.mock.calls[0];
    expect(writes).toEqual([]);
    expect(deletes).toEqual(['def_select']);
  });

  it('audits offering.attributes_updated with actor and offering context', async () => {
    setup();
    await updateOfferingAttributeValues({ offeringId: 'off_1', values: [entry('def_select', { textValue: 'Acetato' })] }, actor);

    expect(recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: 'admin_1', action: 'offering.attributes_updated', targetType: 'ProductOffering', targetId: 'off_1' })
    );
  });
});
