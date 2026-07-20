import { describe, expect, it, vi } from 'vitest';

const resolveOfferingPage = vi.fn();
vi.mock('@/modules/catalog/service', () => ({
  resolveOfferingPage: (...args: unknown[]) => resolveOfferingPage(...args),
}));

const { generateMetadata } = await import('@/app/catalogo/[categorySlug]/[offeringSlug]/page');

function offeringResult(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    kind: 'found' as const,
    offering: {
      categorySlug: 'lentes-opticos',
      categoryName: 'Lentes ópticos',
      offeringSlug: 'coral',
      name: 'Coral',
      description: 'Un modelo liviano.',
      seoTitle: null,
      seoDescription: null,
      priceLabel: 'Desde $19.990',
      coverImageUrl: null,
      ...overrides,
    },
    related: [],
  };
}

describe('app/catalogo/[categorySlug]/[offeringSlug]/page — generateMetadata (Fase 14)', () => {
  it('returns empty metadata for a not-found/redirect resolution — never a fabricated title', async () => {
    resolveOfferingPage.mockResolvedValue({ kind: 'not_found' });
    const metadata = await generateMetadata({
      params: Promise.resolve({ categorySlug: 'lentes-opticos', offeringSlug: 'no-existe' }),
    });
    expect(metadata).toEqual({});
  });

  it('uses the category-aware fallback title when no seoTitle is set', async () => {
    resolveOfferingPage.mockResolvedValue(offeringResult());
    const metadata = await generateMetadata({
      params: Promise.resolve({ categorySlug: 'lentes-opticos', offeringSlug: 'coral' }),
    });
    expect(metadata.title).toBe('Coral — Lentes ópticos | Pepi Visión 360');
  });

  it('the same offering slug under the two categories produces two distinct titles/canonicals', async () => {
    resolveOfferingPage.mockResolvedValue(offeringResult({ categorySlug: 'lentes-opticos', categoryName: 'Lentes ópticos' }));
    const optical = await generateMetadata({
      params: Promise.resolve({ categorySlug: 'lentes-opticos', offeringSlug: 'coral' }),
    });

    resolveOfferingPage.mockResolvedValue(offeringResult({ categorySlug: 'lentes-de-sol', categoryName: 'Lentes de sol' }));
    const sun = await generateMetadata({
      params: Promise.resolve({ categorySlug: 'lentes-de-sol', offeringSlug: 'coral' }),
    });

    expect(optical.title).not.toBe(sun.title);
    expect(optical.alternates?.canonical).not.toBe(sun.alternates?.canonical);
  });

  it('honors an explicit offering.seoTitle without ever overwriting it', async () => {
    resolveOfferingPage.mockResolvedValue(offeringResult({ seoTitle: 'Título fijado por el admin' }));
    const metadata = await generateMetadata({
      params: Promise.resolve({ categorySlug: 'lentes-opticos', offeringSlug: 'coral' }),
    });
    expect(metadata.title).toBe('Título fijado por el admin');
  });
});
