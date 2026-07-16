import { describe, expect, it } from 'vitest';
import { Gender } from '@prisma/client';
import { parseCatalogFilters } from '@/modules/catalog/schemas';
import { buildFilterHref, buildToggleHref } from '@/modules/catalog/filter-url';
import { formatClp } from '@/modules/catalog/labels';
import { slugify } from '@/lib/slug';

describe('modules/catalog/schemas', () => {
  it('parses known, valid filters', () => {
    const filters = parseCatalogFilters({ gender: 'MUJER', price: 'low', availableOnly: '1' });
    expect(filters).toEqual({ gender: Gender.MUJER, price: 'low', availableOnly: true });
  });

  it('drops unknown/invalid values instead of throwing', () => {
    const filters = parseCatalogFilters({ gender: 'no-existe', price: 'gratis' });
    expect(filters).toEqual({ availableOnly: false });
  });

  it('defaults to no filters when searchParams is empty', () => {
    expect(parseCatalogFilters({})).toEqual({ availableOnly: false });
  });

  it('parses a brand filter by slug', () => {
    const filters = parseCatalogFilters({ brand: 'vespa' });
    expect(filters).toEqual({ brand: 'vespa', availableOnly: false });
  });

  it('keeps the brand filter alongside other filters', () => {
    const filters = parseCatalogFilters({ brand: 'vespa', gender: 'MUJER', shape: 'REDONDO' });
    expect(filters).toEqual({ brand: 'vespa', gender: Gender.MUJER, shape: 'REDONDO', availableOnly: false });
  });

  it('does not error on an unrecognized brand slug — it is a valid query that simply matches nothing', () => {
    const filters = parseCatalogFilters({ brand: 'marca-que-no-existe' });
    expect(filters).toEqual({ brand: 'marca-que-no-existe', availableOnly: false });
  });
});

describe('modules/catalog/filter-url', () => {
  const basePath = '/catalogo/armazones';

  it('adds a new param while preserving existing ones', () => {
    const href = buildFilterHref(basePath, new URLSearchParams('gender=MUJER'), 'shape', 'REDONDO');
    expect(href).toBe('/catalogo/armazones?gender=MUJER&shape=REDONDO');
  });

  it('removes a param when value is null', () => {
    const href = buildFilterHref(basePath, new URLSearchParams('gender=MUJER&shape=REDONDO'), 'gender', null);
    expect(href).toBe('/catalogo/armazones?shape=REDONDO');
  });

  it('returns the bare route when no params remain', () => {
    const href = buildFilterHref(basePath, new URLSearchParams('gender=MUJER'), 'gender', null);
    expect(href).toBe('/catalogo/armazones');
  });

  it('toggle clears the value when it is already active', () => {
    const href = buildToggleHref(basePath, new URLSearchParams('color=Fucsia'), 'color', 'Fucsia');
    expect(href).toBe('/catalogo/armazones');
  });

  it('toggle sets the value when a different one is active', () => {
    const href = buildToggleHref(basePath, new URLSearchParams('color=Fucsia'), 'color', 'Negro');
    expect(href).toBe('/catalogo/armazones?color=Negro');
  });

  it('sets the brand filter by slug and persists it across other filter changes', () => {
    const withBrand = buildFilterHref(basePath, new URLSearchParams('gender=MUJER'), 'brand', 'vespa');
    expect(withBrand).toBe('/catalogo/armazones?gender=MUJER&brand=vespa');

    const thenShape = buildFilterHref(basePath, new URLSearchParams(withBrand.split('?')[1]), 'shape', 'REDONDO');
    expect(thenShape).toBe('/catalogo/armazones?gender=MUJER&brand=vespa&shape=REDONDO');
  });

  it('clearing all filters (each set to null) also drops the brand filter', () => {
    let params = new URLSearchParams('gender=MUJER&brand=vespa');
    for (const key of ['gender', 'brand']) {
      params = new URLSearchParams(buildFilterHref(basePath, params, key, null).split('?')[1] ?? '');
    }
    expect(params.toString()).toBe('');
  });
});

describe('modules/catalog/labels', () => {
  it('formats CLP amounts with thousands separators', () => {
    expect(formatClp(39900)).toBe('$39.900');
  });
});

describe('lib/slug', () => {
  it('slugifies a simple name', () => {
    expect(slugify('Aurora')).toBe('aurora');
  });

  it('slugifies a multi-word name', () => {
    expect(slugify('Kids Pop')).toBe('kids-pop');
  });

  it('strips accents and non-alphanumeric characters', () => {
    expect(slugify('Ojalá Ñandú!')).toBe('ojala-nandu');
  });
});
