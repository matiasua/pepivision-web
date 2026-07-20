import { describe, expect, it, vi } from 'vitest';

const getCategorySummary = vi.fn();
vi.mock('@/modules/catalog/service', () => ({
  getCategorySummary: (...args: unknown[]) => getCategorySummary(...args),
  getCategoryBrandFilterOptions: vi.fn(),
  getCategoryFilterableAttributes: vi.fn(),
  getCatalogForCategory: vi.fn(),
  getLegacyRedirectTarget: vi.fn(),
}));

const { generateMetadata } = await import('@/app/catalogo/[categorySlug]/page');

const CATEGORY = {
  slug: 'lentes-opticos',
  name: 'Lentes ópticos',
  shortDescription: 'Armazones ópticos modernos.',
  icon: null,
  imagePath: null,
  seoTitle: null,
  seoDescription: null,
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

function metadataFor(searchParams: Record<string, string>) {
  getCategorySummary.mockResolvedValue(CATEGORY);
  return generateMetadata({
    params: Promise.resolve({ categorySlug: 'lentes-opticos' }),
    searchParams: Promise.resolve(searchParams),
  });
}

describe('app/catalogo/[categorySlug]/page — generateMetadata (URLs facetadas, Fase 14)', () => {
  it('the clean URL (no query params) is indexable', async () => {
    const metadata = await metadataFor({});
    expect(metadata.robots).toEqual({ index: true, follow: true });
  });

  it('a "q" search param makes the URL noindex, follow', async () => {
    const metadata = await metadataFor({ q: 'aurora' });
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });

  it('a dynamic attr_* filter param makes the URL noindex, follow', async () => {
    const metadata = await metadataFor({ attr_material: 'Acetato' });
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });

  it('a "price" filter param makes the URL noindex, follow', async () => {
    const metadata = await metadataFor({ price: 'low' });
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });

  it('an "availableOnly" filter param makes the URL noindex, follow', async () => {
    const metadata = await metadataFor({ availableOnly: '1' });
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });

  it('a pagination-like "page" param makes the URL noindex, follow', async () => {
    const metadata = await metadataFor({ page: '2' });
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });

  it('an unrecognized/unknown query param still forces noindex — fail-closed, not allowlisted', async () => {
    const metadata = await metadataFor({ unknown_param_xyz: 'anything' });
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });

  it('the canonical is always the clean category URL, regardless of which filter is present', async () => {
    const clean = await metadataFor({});
    const filtered = await metadataFor({ q: 'aurora', attr_material: 'Acetato', price: 'low' });
    expect(clean.alternates?.canonical).toBe(filtered.alternates?.canonical);
    expect(filtered.alternates?.canonical).toBe('http://localhost:8080/catalogo/lentes-opticos');
  });

  it('a filter value never leaks into the title or description', async () => {
    const metadata = await metadataFor({ q: 'nombre-de-prueba-filtrado' });
    expect(metadata.title).not.toContain('nombre-de-prueba-filtrado');
    expect(metadata.description).not.toContain('nombre-de-prueba-filtrado');
  });
});
