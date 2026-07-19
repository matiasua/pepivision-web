import { describe, expect, it } from 'vitest';
import {
  DYNAMIC_FILTER_PREFIX,
  parseDynamicFilters,
  selectFilterableAttributes,
  type CategoryAttributeDefinitionLike,
  type FilterableAttributeDefinition,
} from '@/modules/catalog/dynamic-filters';

function def(overrides: Partial<CategoryAttributeDefinitionLike> = {}): CategoryAttributeDefinitionLike {
  return {
    id: 'attr_1',
    key: 'certificacion',
    label: 'Certificación',
    type: 'SELECT',
    options: ['uv400', 'polarizado'],
    sortOrder: 0,
    active: true,
    filterable: true,
    ...overrides,
  };
}

describe('modules/catalog/dynamic-filters — selectFilterableAttributes', () => {
  it('keeps only active AND filterable definitions', () => {
    const result = selectFilterableAttributes([
      def({ id: 'a', active: true, filterable: true }),
      def({ id: 'b', active: false, filterable: true }),
      def({ id: 'c', active: true, filterable: false }),
      def({ id: 'd', active: false, filterable: false }),
    ]);
    expect(result.map((d) => d.id)).toEqual(['a']);
  });

  it('sorts by sortOrder', () => {
    const result = selectFilterableAttributes([def({ id: 'b', sortOrder: 2 }), def({ id: 'a', sortOrder: 1, key: 'otro' })]);
    expect(result.map((d) => d.id)).toEqual(['a', 'b']);
  });

  it('never leaks required/visibleInCard/visibleInDetail — only the fields the public filter system needs', () => {
    const [result] = selectFilterableAttributes([def()]);
    expect(Object.keys(result).sort()).toEqual(['id', 'key', 'label', 'options', 'sortOrder', 'type'].sort());
  });
});

describe('modules/catalog/dynamic-filters — parseDynamicFilters', () => {
  const selectDef: FilterableAttributeDefinition = {
    id: 'def_select',
    key: 'certificacion',
    label: 'Certificación',
    type: 'SELECT',
    options: ['uv400', 'polarizado'],
    sortOrder: 0,
  };
  const multiDef: FilterableAttributeDefinition = {
    id: 'def_multi',
    key: 'tratamientos_extra',
    label: 'Tratamientos extra',
    type: 'MULTI_SELECT',
    options: ['a', 'b', 'c'],
    sortOrder: 1,
  };
  const boolDef: FilterableAttributeDefinition = {
    id: 'def_bool',
    key: 'espejado',
    label: 'Espejado',
    type: 'BOOLEAN',
    options: null,
    sortOrder: 2,
  };
  const numberDef: FilterableAttributeDefinition = {
    id: 'def_number',
    key: 'peso',
    label: 'Peso',
    type: 'NUMBER',
    options: null,
    sortOrder: 3,
  };
  const rangeDef: FilterableAttributeDefinition = {
    id: 'def_range',
    key: 'precio_lente',
    label: 'Precio del cristal',
    type: 'RANGE',
    options: null,
    sortOrder: 4,
  };
  const definitions = [selectDef, multiDef, boolDef, numberDef, rangeDef];

  it('returns [] when no query params are present', () => {
    expect(parseDynamicFilters(definitions, {})).toEqual([]);
  });

  it('resolves a known, valid SELECT param to its attributeDefinitionId', () => {
    const result = parseDynamicFilters(definitions, { [`${DYNAMIC_FILTER_PREFIX}certificacion`]: 'uv400' });
    expect(result).toEqual([{ attributeDefinitionId: 'def_select', key: 'certificacion', type: 'SELECT', values: ['uv400'] }]);
  });

  it('drops an unknown query param entirely (not matching any active/filterable definition key)', () => {
    const result = parseDynamicFilters(definitions, { [`${DYNAMIC_FILTER_PREFIX}no_existe`]: 'x', otherParam: 'y' });
    expect(result).toEqual([]);
  });

  it('drops a param matching an attribute that is not filterable (never reaches parseDynamicFilters since selectFilterableAttributes already excluded it, but confirms end-to-end)', () => {
    const nonFilterable = def({ id: 'hidden', key: 'oculto', filterable: false });
    const filterable = selectFilterableAttributes([nonFilterable]);
    const result = parseDynamicFilters(filterable, { [`${DYNAMIC_FILTER_PREFIX}oculto`]: 'x' });
    expect(result).toEqual([]);
  });

  it('rejects a SELECT value not present in the declared options allowlist', () => {
    const result = parseDynamicFilters(definitions, { [`${DYNAMIC_FILTER_PREFIX}certificacion`]: 'not-a-real-option' });
    expect(result).toEqual([]);
  });

  it('rejects more than one value for a SELECT (single-value) param instead of guessing', () => {
    const result = parseDynamicFilters(definitions, {
      [`${DYNAMIC_FILTER_PREFIX}certificacion`]: ['uv400', 'polarizado'],
    });
    expect(result).toEqual([]);
  });

  it('accepts multiple values for a MULTI_SELECT param (OR semantics preserved as an array)', () => {
    const result = parseDynamicFilters(definitions, {
      [`${DYNAMIC_FILTER_PREFIX}tratamientos_extra`]: ['a', 'b'],
    });
    expect(result).toEqual([{ attributeDefinitionId: 'def_multi', key: 'tratamientos_extra', type: 'MULTI_SELECT', values: ['a', 'b'] }]);
  });

  it('deduplicates repeated values in a MULTI_SELECT param', () => {
    const result = parseDynamicFilters(definitions, {
      [`${DYNAMIC_FILTER_PREFIX}tratamientos_extra`]: ['a', 'a', 'b'],
    });
    expect(result[0].values).toEqual(['a', 'b']);
  });

  it('limits the number of MULTI_SELECT values accepted (no DoS via hundreds of values)', () => {
    const many = Array.from({ length: 50 }, (_, i) => `x${i}`);
    const manyOptionsDef: FilterableAttributeDefinition = { ...multiDef, options: many };
    const result = parseDynamicFilters([manyOptionsDef], { [`${DYNAMIC_FILTER_PREFIX}tratamientos_extra`]: many });
    expect(result[0].values!.length).toBeLessThanOrEqual(20);
  });

  it('rejects an empty-string value', () => {
    const result = parseDynamicFilters(definitions, { [`${DYNAMIC_FILTER_PREFIX}certificacion`]: '' });
    expect(result).toEqual([]);
  });

  it('rejects a value exceeding the max length', () => {
    const noOptionsDef: FilterableAttributeDefinition = { ...selectDef, options: null };
    const result = parseDynamicFilters([noOptionsDef], { [`${DYNAMIC_FILTER_PREFIX}certificacion`]: 'x'.repeat(200) });
    expect(result).toEqual([]);
  });

  it('BOOLEAN: only "1" is accepted; any other value is dropped', () => {
    expect(parseDynamicFilters(definitions, { [`${DYNAMIC_FILTER_PREFIX}espejado`]: '1' })).toEqual([
      { attributeDefinitionId: 'def_bool', key: 'espejado', type: 'BOOLEAN', booleanValue: true },
    ]);
    expect(parseDynamicFilters(definitions, { [`${DYNAMIC_FILTER_PREFIX}espejado`]: 'true' })).toEqual([]);
    expect(parseDynamicFilters(definitions, { [`${DYNAMIC_FILTER_PREFIX}espejado`]: '0' })).toEqual([]);
  });

  it('NUMBER: accepts a finite non-negative number, rejects NaN/Infinity/negative', () => {
    expect(parseDynamicFilters(definitions, { [`${DYNAMIC_FILTER_PREFIX}peso`]: '42' })).toEqual([
      { attributeDefinitionId: 'def_number', key: 'peso', type: 'NUMBER', numberValue: 42 },
    ]);
    expect(parseDynamicFilters(definitions, { [`${DYNAMIC_FILTER_PREFIX}peso`]: 'not-a-number' })).toEqual([]);
    expect(parseDynamicFilters(definitions, { [`${DYNAMIC_FILTER_PREFIX}peso`]: 'Infinity' })).toEqual([]);
    expect(parseDynamicFilters(definitions, { [`${DYNAMIC_FILTER_PREFIX}peso`]: '-5' })).toEqual([]);
  });

  it('RANGE: accepts a valid min/max pair', () => {
    const result = parseDynamicFilters(definitions, {
      [`${DYNAMIC_FILTER_PREFIX}precio_lente_min`]: '10000',
      [`${DYNAMIC_FILTER_PREFIX}precio_lente_max`]: '20000',
    });
    expect(result).toEqual([{ attributeDefinitionId: 'def_range', key: 'precio_lente', type: 'RANGE', rangeMin: 10000, rangeMax: 20000 }]);
  });

  it('RANGE: accepts only a min or only a max', () => {
    const result = parseDynamicFilters(definitions, { [`${DYNAMIC_FILTER_PREFIX}precio_lente_min`]: '10000' });
    expect(result).toEqual([{ attributeDefinitionId: 'def_range', key: 'precio_lente', type: 'RANGE', rangeMin: 10000, rangeMax: undefined }]);
  });

  it('RANGE: drops the entire filter when min > max, without throwing', () => {
    const result = parseDynamicFilters(definitions, {
      [`${DYNAMIC_FILTER_PREFIX}precio_lente_min`]: '50000',
      [`${DYNAMIC_FILTER_PREFIX}precio_lente_max`]: '10000',
    });
    expect(result).toEqual([]);
  });

  it('RANGE: drops a malformed numeric value instead of crashing', () => {
    expect(() =>
      parseDynamicFilters(definitions, { [`${DYNAMIC_FILTER_PREFIX}precio_lente_min`]: 'abc' })
    ).not.toThrow();
    expect(parseDynamicFilters(definitions, { [`${DYNAMIC_FILTER_PREFIX}precio_lente_min`]: 'abc' })).toEqual([]);
  });

  it('combines common-shaped and multiple dynamic filters together without interference', () => {
    const result = parseDynamicFilters(definitions, {
      [`${DYNAMIC_FILTER_PREFIX}certificacion`]: 'uv400',
      [`${DYNAMIC_FILTER_PREFIX}espejado`]: '1',
      gender: 'UNISEX', // a common-filter-shaped key, not a dynamic one — must be ignored here
    });
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.key).sort()).toEqual(['certificacion', 'espejado']);
  });

  it('never throws on a completely malformed/unexpected searchParams shape', () => {
    expect(() => parseDynamicFilters(definitions, { [`${DYNAMIC_FILTER_PREFIX}certificacion`]: undefined })).not.toThrow();
  });
});
