import { afterEach, describe, expect, it, vi } from 'vitest';

const getCategoryPicker = vi.fn();
const getPublicOfferingsForSitemap = vi.fn();
vi.mock('@/modules/catalog/service', () => ({
  getCategoryPicker: (...args: unknown[]) => getCategoryPicker(...args),
  getPublicOfferingsForSitemap: (...args: unknown[]) => getPublicOfferingsForSitemap(...args),
}));

const { default: sitemap } = await import('@/app/sitemap');

const CATEGORY_UPDATED_AT = new Date('2026-01-01T00:00:00Z');
const OFFERING_UPDATED_AT = new Date('2026-02-01T00:00:00Z');

describe('app/sitemap — Fase 14', () => {
  afterEach(() => vi.clearAllMocks());

  it('includes exactly one entry per canonical category and one per public offering', async () => {
    getCategoryPicker.mockResolvedValue([
      { slug: 'lentes-opticos', name: 'Lentes ópticos', updatedAt: CATEGORY_UPDATED_AT },
      { slug: 'lentes-de-sol', name: 'Lentes de sol', updatedAt: CATEGORY_UPDATED_AT },
    ]);
    getPublicOfferingsForSitemap.mockResolvedValue([
      { categorySlug: 'lentes-opticos', offeringSlug: 'coral', updatedAt: OFFERING_UPDATED_AT },
    ]);

    const entries = await sitemap();

    expect(entries).toHaveLength(3);
    expect(entries.map((e) => e.url)).toEqual([
      'http://localhost:8080/catalogo/lentes-opticos',
      'http://localhost:8080/catalogo/lentes-de-sol',
      'http://localhost:8080/catalogo/lentes-opticos/coral',
    ]);
  });

  it('the same Product offered in two categories produces two distinct sitemap URLs', async () => {
    getCategoryPicker.mockResolvedValue([]);
    getPublicOfferingsForSitemap.mockResolvedValue([
      { categorySlug: 'lentes-opticos', offeringSlug: 'coral', updatedAt: OFFERING_UPDATED_AT },
      { categorySlug: 'lentes-de-sol', offeringSlug: 'coral', updatedAt: OFFERING_UPDATED_AT },
    ]);

    const entries = await sitemap();
    const urls = entries.map((e) => e.url);
    expect(urls).toContain('http://localhost:8080/catalogo/lentes-opticos/coral');
    expect(urls).toContain('http://localhost:8080/catalogo/lentes-de-sol/coral');
    expect(new Set(urls).size).toBe(2);
  });

  it('uses the real updatedAt as lastModified, never a freshly-generated Date', async () => {
    getCategoryPicker.mockResolvedValue([{ slug: 'lentes-opticos', name: 'Lentes ópticos', updatedAt: CATEGORY_UPDATED_AT }]);
    getPublicOfferingsForSitemap.mockResolvedValue([]);

    const entries = await sitemap();
    expect(entries[0].lastModified).toBe(CATEGORY_UPDATED_AT);
  });

  it('never includes legacy slugs, admin routes, or query-param URLs — only what the service layer already filters to public/canonical', async () => {
    getCategoryPicker.mockResolvedValue([{ slug: 'lentes-opticos', name: 'Lentes ópticos', updatedAt: CATEGORY_UPDATED_AT }]);
    getPublicOfferingsForSitemap.mockResolvedValue([
      { categorySlug: 'lentes-opticos', offeringSlug: 'coral', updatedAt: OFFERING_UPDATED_AT },
    ]);

    const entries = await sitemap();
    for (const entry of entries) {
      expect(entry.url).not.toContain('armazones');
      expect(entry.url).not.toContain('lentes-de-sol-opticos');
      expect(entry.url).not.toContain('/admin');
      expect(entry.url).not.toContain('?');
    }
  });

  it('returns an empty sitemap (never throws) when the catalog is empty', async () => {
    getCategoryPicker.mockResolvedValue([]);
    getPublicOfferingsForSitemap.mockResolvedValue([]);

    const entries = await sitemap();
    expect(entries).toEqual([]);
  });
});
