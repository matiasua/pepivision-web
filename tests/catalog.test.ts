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
});

describe('modules/catalog/filter-url', () => {
  it('adds a new param while preserving existing ones', () => {
    const href = buildFilterHref(new URLSearchParams('gender=MUJER'), 'shape', 'REDONDO');
    expect(href).toBe('/catalogo?gender=MUJER&shape=REDONDO');
  });

  it('removes a param when value is null', () => {
    const href = buildFilterHref(new URLSearchParams('gender=MUJER&shape=REDONDO'), 'gender', null);
    expect(href).toBe('/catalogo?shape=REDONDO');
  });

  it('returns the bare route when no params remain', () => {
    const href = buildFilterHref(new URLSearchParams('gender=MUJER'), 'gender', null);
    expect(href).toBe('/catalogo');
  });

  it('toggle clears the value when it is already active', () => {
    const href = buildToggleHref(new URLSearchParams('color=Fucsia'), 'color', 'Fucsia');
    expect(href).toBe('/catalogo');
  });

  it('toggle sets the value when a different one is active', () => {
    const href = buildToggleHref(new URLSearchParams('color=Fucsia'), 'color', 'Negro');
    expect(href).toBe('/catalogo?color=Negro');
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
