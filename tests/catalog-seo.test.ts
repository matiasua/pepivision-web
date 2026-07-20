import { describe, expect, it } from 'vitest';
import {
  buildCategoryBreadcrumb,
  buildCategoryCanonicalUrl,
  buildCategoryMetadata,
  buildOfferingBreadcrumb,
  buildOfferingCanonicalUrl,
  buildOfferingMetadata,
  serializeJsonLd,
  toBreadcrumbListJsonLd,
  toItemListJsonLd,
  toOfferingProductJsonLd,
} from '@/modules/catalog/seo';

function category(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    slug: 'lentes-opticos',
    name: 'Lentes ópticos',
    shortDescription: 'Armazones ópticos modernos.',
    seoTitle: null as string | null,
    seoDescription: null as string | null,
    imagePath: null as string | null,
    ...overrides,
  };
}

function offering(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    categorySlug: 'lentes-opticos',
    categoryName: 'Lentes ópticos',
    offeringSlug: 'coral',
    name: 'Coral',
    description: 'Un modelo liviano y versátil.',
    seoTitle: null as string | null,
    seoDescription: null as string | null,
    priceLabel: 'Desde $19.990',
    coverImageUrl: null as string | null,
    ...overrides,
  };
}

describe('modules/catalog/seo — buildCategoryMetadata', () => {
  it('uses category.seoTitle/seoDescription when the admin set them explicitly', () => {
    const metadata = buildCategoryMetadata(
      category({ seoTitle: 'Título SEO admin', seoDescription: 'Descripción SEO admin' }),
      { hasQueryParams: false }
    );
    expect(metadata.title).toBe('Título SEO admin');
    expect(metadata.description).toBe('Descripción SEO admin');
  });

  it('falls back to a Lentes ópticos-aware title/description when seoTitle/seoDescription are unset', () => {
    const metadata = buildCategoryMetadata(category(), { hasQueryParams: false });
    expect(metadata.title).toContain('Lentes ópticos');
    expect(metadata.description).toBe('Armazones ópticos modernos.');
  });

  it('falls back to a Lentes de sol-aware title when seoTitle is unset', () => {
    const metadata = buildCategoryMetadata(category({ slug: 'lentes-de-sol', name: 'Lentes de sol', shortDescription: null }), {
      hasQueryParams: false,
    });
    expect(metadata.title).toContain('Lentes de sol');
    expect(metadata.description.toLowerCase()).toContain('lentes de sol');
  });

  it('never uses the technical slug as visible title text', () => {
    const metadata = buildCategoryMetadata(category(), { hasQueryParams: false });
    expect(metadata.title).not.toContain('lentes-opticos');
  });

  it('canonical always points to the clean category URL, regardless of hasQueryParams', () => {
    const clean = buildCategoryMetadata(category(), { hasQueryParams: false });
    const filtered = buildCategoryMetadata(category(), { hasQueryParams: true });
    expect(clean.alternates?.canonical).toBe('http://localhost:8080/catalogo/lentes-opticos');
    expect(filtered.alternates?.canonical).toBe('http://localhost:8080/catalogo/lentes-opticos');
  });

  it('indexes the clean URL (index: true, follow: true)', () => {
    const metadata = buildCategoryMetadata(category(), { hasQueryParams: false });
    expect(metadata.robots).toEqual({ index: true, follow: true });
  });

  it('noindexes a filtered URL, but keeps follow: true so internal links stay crawlable', () => {
    const metadata = buildCategoryMetadata(category(), { hasQueryParams: true });
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });

  it('Open Graph title/description/url are coherent with the page metadata', () => {
    const metadata = buildCategoryMetadata(category(), { hasQueryParams: false });
    expect(metadata.openGraph?.title).toBe(metadata.title);
    expect(metadata.openGraph?.description).toBe(metadata.description);
    expect(metadata.openGraph?.url).toBe(metadata.alternates?.canonical);
  });

  it('omits openGraph/twitter images entirely when the category has no public image', () => {
    const metadata = buildCategoryMetadata(category({ imagePath: null }), { hasQueryParams: false });
    expect(metadata.openGraph?.images).toBeUndefined();
    expect(metadata.twitter?.images).toBeUndefined();
  });

  it('uses the category image for openGraph/twitter when present', () => {
    const metadata = buildCategoryMetadata(category({ imagePath: 'https://cdn.example.test/categories/optical.jpg' }), {
      hasQueryParams: false,
    });
    expect(metadata.openGraph?.images).toEqual([{ url: 'https://cdn.example.test/categories/optical.jpg' }]);
    expect(metadata.twitter?.images).toEqual(['https://cdn.example.test/categories/optical.jpg']);
  });
});

describe('modules/catalog/seo — buildOfferingMetadata', () => {
  it('uses offering.seoTitle/seoDescription when the admin set them, never silently overwritten', () => {
    const metadata = buildOfferingMetadata(offering({ seoTitle: 'Título admin', seoDescription: 'Descripción admin' }));
    expect(metadata.title).toBe('Título admin');
    expect(metadata.description).toBe('Descripción admin');
  });

  it('falls back to a category-aware title when seoTitle is unset', () => {
    const metadata = buildOfferingMetadata(offering());
    expect(metadata.title).toBe('Coral — Lentes ópticos | Pepi Visión 360');
  });

  it('the same Product in two categories produces two distinct titles via the category-aware fallback', () => {
    const optical = buildOfferingMetadata(offering({ categoryName: 'Lentes ópticos' }));
    const sun = buildOfferingMetadata(offering({ categorySlug: 'lentes-de-sol', categoryName: 'Lentes de sol' }));
    expect(optical.title).not.toBe(sun.title);
    expect(optical.title).toContain('Lentes ópticos');
    expect(sun.title).toContain('Lentes de sol');
  });

  it('canonical differs per category for the same offering slug', () => {
    const optical = buildOfferingMetadata(offering({ categorySlug: 'lentes-opticos' }));
    const sun = buildOfferingMetadata(offering({ categorySlug: 'lentes-de-sol' }));
    expect(optical.alternates?.canonical).not.toBe(sun.alternates?.canonical);
    expect(optical.alternates?.canonical).toBe('http://localhost:8080/catalogo/lentes-opticos/coral');
    expect(sun.alternates?.canonical).toBe('http://localhost:8080/catalogo/lentes-de-sol/coral');
  });

  it('always indexes the offering detail page (no faceted variants exist for it)', () => {
    const metadata = buildOfferingMetadata(offering());
    expect(metadata.robots).toEqual({ index: true, follow: true });
  });

  it('uses the cover image for openGraph/twitter when present', () => {
    const metadata = buildOfferingMetadata(offering({ coverImageUrl: 'https://cdn.example.test/coral.jpg' }));
    expect(metadata.openGraph?.images).toEqual([{ url: 'https://cdn.example.test/coral.jpg' }]);
  });

  it('falls back to no image entirely when the offering has none — never a broken/administrative image', () => {
    const metadata = buildOfferingMetadata(offering({ coverImageUrl: null }));
    expect(metadata.openGraph?.images).toBeUndefined();
  });

  it('never adds the price to the title', () => {
    const metadata = buildOfferingMetadata(offering());
    expect(metadata.title).not.toContain('$');
  });
});

describe('modules/catalog/seo — BreadcrumbList', () => {
  it('category breadcrumb is Inicio → Catálogo → Categoría, with absolute canonical URLs and correct positions', () => {
    const jsonLd = toBreadcrumbListJsonLd(buildCategoryBreadcrumb({ slug: 'lentes-opticos', name: 'Lentes ópticos' }));
    expect(jsonLd['@type']).toBe('BreadcrumbList');
    expect(jsonLd.itemListElement).toHaveLength(3);
    expect(jsonLd.itemListElement.map((i) => i.position)).toEqual([1, 2, 3]);
    expect(jsonLd.itemListElement[2].name).toBe('Lentes ópticos');
    expect(jsonLd.itemListElement[2].item).toBe(buildCategoryCanonicalUrl('lentes-opticos'));
  });

  it('offering breadcrumb adds a fourth level for the offering, never the raw slug as its name', () => {
    const jsonLd = toBreadcrumbListJsonLd(
      buildOfferingBreadcrumb({ slug: 'lentes-opticos', name: 'Lentes ópticos' }, { slug: 'coral', name: 'Coral' })
    );
    expect(jsonLd.itemListElement).toHaveLength(4);
    expect(jsonLd.itemListElement[3].name).toBe('Coral');
    expect(jsonLd.itemListElement[3].item).toBe(buildOfferingCanonicalUrl('lentes-opticos', 'coral'));
  });

  it('never uses a technical slug/id as the visible breadcrumb name', () => {
    const jsonLd = toBreadcrumbListJsonLd(buildCategoryBreadcrumb({ slug: 'lentes-opticos', name: 'Lentes ópticos' }));
    for (const item of jsonLd.itemListElement) {
      expect(item.name).not.toBe('lentes-opticos');
    }
  });
});

describe('modules/catalog/seo — ItemList', () => {
  it('produces one ListItem per entry, with correct 1-based position and canonical URL', () => {
    const jsonLd = toItemListJsonLd([
      { categorySlug: 'lentes-opticos', offeringSlug: 'coral', name: 'Coral', imageUrl: 'https://cdn.example.test/coral.jpg' },
      { categorySlug: 'lentes-opticos', offeringSlug: 'aurora', name: 'Aurora', imageUrl: null },
    ]);
    expect(jsonLd.itemListElement).toHaveLength(2);
    expect(jsonLd.itemListElement[0]).toMatchObject({ position: 1, name: 'Coral', url: buildOfferingCanonicalUrl('lentes-opticos', 'coral') });
    expect(jsonLd.itemListElement[0].image).toBe('https://cdn.example.test/coral.jpg');
    expect(jsonLd.itemListElement[1]).toMatchObject({ position: 2, name: 'Aurora' });
    expect(jsonLd.itemListElement[1].image).toBeUndefined();
  });

  it('the same Product offered in two categories yields two distinct ListItem URLs, never collapsed into one', () => {
    const jsonLd = toItemListJsonLd([
      { categorySlug: 'lentes-opticos', offeringSlug: 'coral', name: 'Coral', imageUrl: null },
      { categorySlug: 'lentes-de-sol', offeringSlug: 'coral', name: 'Coral', imageUrl: null },
    ]);
    const urls = jsonLd.itemListElement.map((i) => i.url);
    expect(new Set(urls).size).toBe(2);
  });

  it('never includes technical ids', () => {
    const jsonLd = toItemListJsonLd([{ categorySlug: 'lentes-opticos', offeringSlug: 'coral', name: 'Coral', imageUrl: null }]);
    expect(JSON.stringify(jsonLd)).not.toMatch(/"id":/);
  });
});

describe('modules/catalog/seo — Product/Offer JSON-LD', () => {
  function productInput(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      categorySlug: 'lentes-opticos',
      categoryName: 'Lentes ópticos',
      offeringSlug: 'coral',
      name: 'Coral',
      description: 'Un modelo liviano.',
      brandName: 'Vespa' as string | null,
      images: ['https://cdn.example.test/coral-1.jpg'],
      priceFromClp: 19990 as number | null,
      ...overrides,
    };
  }

  it('includes Brand when present', () => {
    const jsonLd = toOfferingProductJsonLd(productInput());
    expect(jsonLd.brand).toEqual({ '@type': 'Brand', name: 'Vespa' });
  });

  it('omits brand entirely when the product has none', () => {
    const jsonLd = toOfferingProductJsonLd(productInput({ brandName: null }));
    expect(jsonLd).not.toHaveProperty('brand');
  });

  it('includes an Offer with ProductOffering.priceFromClp as a raw number, priceCurrency CLP, and the canonical URL', () => {
    const jsonLd = toOfferingProductJsonLd(productInput({ priceFromClp: 45000 }));
    expect(jsonLd.offers).toEqual({
      '@type': 'Offer',
      url: buildOfferingCanonicalUrl('lentes-opticos', 'coral'),
      priceCurrency: 'CLP',
      price: 45000,
    });
  });

  it('never emits price as a string containing "$"', () => {
    const jsonLd = toOfferingProductJsonLd(productInput({ priceFromClp: 45000 }));
    expect(typeof jsonLd.offers?.price).toBe('number');
    expect(String(jsonLd.offers?.price)).not.toContain('$');
  });

  it('omits the entire offers node when priceFromClp is null — never price: 0, never a "Cotizar" string, never priceCurrency alone', () => {
    const jsonLd = toOfferingProductJsonLd(productInput({ priceFromClp: null }));
    expect(jsonLd).not.toHaveProperty('offers');
    expect(JSON.stringify(jsonLd)).not.toContain('Cotizar');
    expect(JSON.stringify(jsonLd)).not.toMatch(/"price":\s*0/);
  });

  it('never fabricates an availability/stock claim', () => {
    const jsonLd = toOfferingProductJsonLd(productInput());
    expect(JSON.stringify(jsonLd)).not.toContain('availability');
    expect(JSON.stringify(jsonLd)).not.toContain('InStock');
  });

  it('omits image entirely when there are none, never a broken/administrative path', () => {
    const jsonLd = toOfferingProductJsonLd(productInput({ images: [] }));
    expect(jsonLd).not.toHaveProperty('image');
  });
});

describe('modules/catalog/seo — serializeJsonLd (safe <script> embedding)', () => {
  it('escapes "<" so a value can never prematurely close the surrounding <script> tag', () => {
    const serialized = serializeJsonLd({ name: '</script><script>alert(1)</script>' });
    expect(serialized).not.toContain('</script>');
    expect(serialized).toContain('\\u003c/script\\u003e');
  });

  it('escapes ">" as well', () => {
    const serialized = serializeJsonLd({ name: 'a > b' });
    expect(serialized).not.toContain('>');
    expect(serialized).toContain('\\u003e');
  });

  it('escapes "&" to avoid HTML entity confusion', () => {
    const serialized = serializeJsonLd({ name: 'Tom & Jerry' });
    expect(serialized).toContain('\\u0026');
  });

  it('preserves double quotes as valid JSON string delimiters', () => {
    const serialized = serializeJsonLd({ name: 'Modelo "Aurora"' });
    expect(() => JSON.parse(serialized)).not.toThrow();
    expect(JSON.parse(serialized).name).toBe('Modelo "Aurora"');
  });

  it('round-trips Unicode characters correctly', () => {
    const serialized = serializeJsonLd({ name: 'Lentes ópticos — 座 – 🕶️' });
    const parsed = JSON.parse(serialized);
    expect(parsed.name).toBe('Lentes ópticos — 座 – 🕶️');
  });

  it('never contains a literal, unescaped "</script>" for any adversarial nested-quote input', () => {
    const serialized = serializeJsonLd({ a: '"><script>alert(String.fromCharCode(1))</script>' });
    expect(serialized.toLowerCase()).not.toContain('</script>');
  });
});
