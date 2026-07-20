import { test, expect } from '@playwright/test';
import { Gender, ProductMaterial, ProductShape } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { E2E_CATALOG_PRODUCT_SLUG, readE2eFixtures } from '../fixtures/test-data';

function parseJsonLdBlocks(html: string): unknown[] {
  const matches = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  return matches.map((m) => JSON.parse(m[1]));
}

// Fase 14 (redesign-extensible-catalog-v2 — SEO y compatibilidad de
// rutas): metadata, canonical, robots, JSON-LD y sitemap del catálogo
// público, contra el stack real (nginx + web + Postgres).
test.describe('SEO del catálogo público (Fase 14)', () => {
  test('la URL limpia de categoría es indexable, con canonical propio y JSON-LD de BreadcrumbList + ItemList', async ({
    page,
    request,
  }) => {
    const response = await page.goto('/catalogo/lentes-opticos');
    expect(response?.status()).toBe(200);

    await expect(page).toHaveTitle(/Lentes ópticos/);
    const robotsMeta = await page.locator('meta[name="robots"]').getAttribute('content');
    expect(robotsMeta).toBe('index, follow');
    const canonicalHref = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonicalHref).toMatch(/\/catalogo\/lentes-opticos$/);

    const html = await request.get('/catalogo/lentes-opticos').then((r) => r.text());
    const blocks = parseJsonLdBlocks(html) as Array<{ '@type': string; itemListElement: unknown[] }>;
    const breadcrumb = blocks.find((b) => b['@type'] === 'BreadcrumbList');
    const itemList = blocks.find((b) => b['@type'] === 'ItemList');
    expect(breadcrumb).toBeTruthy();
    expect(itemList).toBeTruthy();
    expect((itemList!.itemListElement as unknown[]).length).toBeGreaterThan(0);
  });

  test('una URL de categoría con filtros es noindex/follow, canonical apunta a la URL limpia, y no expone ItemList', async ({
    page,
    request,
  }) => {
    await page.goto('/catalogo/lentes-opticos?q=zzz-filtro-e2e-zzz');
    const robotsMeta = await page.locator('meta[name="robots"]').getAttribute('content');
    expect(robotsMeta).toBe('noindex, follow');
    const canonicalHref = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonicalHref).toMatch(/\/catalogo\/lentes-opticos$/);
    expect(canonicalHref).not.toContain('q=');

    const html = await request.get('/catalogo/lentes-opticos?q=zzz-filtro-e2e-zzz').then((r) => r.text());
    const blocks = parseJsonLdBlocks(html) as Array<{ '@type': string }>;
    expect(blocks.some((b) => b['@type'] === 'BreadcrumbList')).toBe(true);
    expect(blocks.some((b) => b['@type'] === 'ItemList')).toBe(false);
  });

  test('un attr_* de filtro dinámico también fuerza noindex/follow', async ({ page }) => {
    await page.goto('/catalogo/lentes-opticos?attr_no_existe=x');
    const robotsMeta = await page.locator('meta[name="robots"]').getAttribute('content');
    expect(robotsMeta).toBe('noindex, follow');
  });

  test('la ficha de ProductOffering tiene título category-aware, canonical propio y JSON-LD de BreadcrumbList + Product/Offer', async ({
    page,
    request,
  }) => {
    const { catalogProduct } = await readE2eFixtures();
    const response = await page.goto(`/catalogo/${catalogProduct.categorySlug}/${catalogProduct.offeringSlug}`);
    expect(response?.status()).toBe(200);

    await expect(page).toHaveTitle(/Lentes ópticos/);
    const canonicalHref = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonicalHref).toMatch(new RegExp(`/catalogo/${catalogProduct.categorySlug}/${catalogProduct.offeringSlug}$`));

    const html = await request.get(`/catalogo/${catalogProduct.categorySlug}/${catalogProduct.offeringSlug}`).then((r) => r.text());
    const blocks = parseJsonLdBlocks(html) as Array<Record<string, unknown>>;
    const breadcrumb = blocks.find((b) => b['@type'] === 'BreadcrumbList');
    const product = blocks.find((b) => b['@type'] === 'Product');
    expect(breadcrumb).toBeTruthy();
    expect(product).toBeTruthy();
    // No debe filtrar IDs técnicos de dominio como propiedades del JSON-LD
    // (la URL de imagen sí incluye el id del producto como carpeta de
    // almacenamiento público — eso es la convención ya establecida en toda
    // la app, no una fuga de la Fase 14).
    expect(product).not.toHaveProperty('offeringId');
    expect(product).not.toHaveProperty('categoryId');
    expect(product).not.toHaveProperty('productId');
    expect(product).not.toHaveProperty('id');
  });

  test('sitemap.xml incluye las dos categorías canónicas y ofertas públicas, sin slugs legacy', async ({ request }) => {
    const response = await request.get('/sitemap.xml');
    expect(response.status()).toBe(200);
    const xml = await response.text();

    expect(xml).toContain('<loc>http://localhost:8080/catalogo/lentes-opticos</loc>');
    expect(xml).toContain('<loc>http://localhost:8080/catalogo/lentes-de-sol</loc>');
    expect(xml).toContain(`/catalogo/lentes-opticos/${E2E_CATALOG_PRODUCT_SLUG}`);
    expect(xml).not.toContain('armazones');
    expect(xml).not.toContain('lentes-de-sol-opticos');
    expect(xml).not.toContain('/admin');
    const locUrls = [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);
    expect(locUrls.length).toBeGreaterThan(0);
    for (const url of locUrls) {
      expect(url).not.toContain('?');
    }
  });

  test('una oferta oculta creada en tiempo real nunca aparece en sitemap.xml', async ({ request }) => {
    const category = await prisma.category.findUniqueOrThrow({ where: { slug: 'lentes-opticos' } });
    const tag = `e2e-seo-hidden-${Date.now()}`;
    const product = await prisma.product.create({
      data: {
        name: `Producto oculto E2E ${tag}`,
        code: tag,
        slug: tag,
        gender: Gender.UNISEX,
        shape: ProductShape.REDONDO,
        material: ProductMaterial.ACETATO,
        priceFromClp: 19990,
        available: true,
        visible: true,
      },
    });
    const offering = await prisma.productOffering.create({
      data: {
        productId: product.id,
        categoryId: category.id,
        slug: tag,
        priceFromClp: 19990,
        active: true,
        visible: false, // oculta — nunca debe aparecer
      },
    });
    try {
      const xml = await request.get('/sitemap.xml').then((r) => r.text());
      expect(xml).not.toContain(`/catalogo/lentes-opticos/${tag}`);
    } finally {
      await prisma.productOffering.delete({ where: { id: offering.id } });
      await prisma.product.delete({ where: { id: product.id } });
    }
  });

  test('el redirect de /catalogo/armazones/[slug] (3 segmentos) usa 308, sin cadenas, hacia el destino final sin slug legacy', async ({
    request,
  }) => {
    const response = await request.get(`/catalogo/armazones/${E2E_CATALOG_PRODUCT_SLUG}`, { maxRedirects: 0 });
    expect(response.status()).toBe(308);
    const location = response.headers()['location'];
    expect(location).toMatch(new RegExp(`/catalogo/lentes-opticos/${E2E_CATALOG_PRODUCT_SLUG}$`));
    expect(location).not.toContain('armazones');
  });

  test('el redirect de un slug de producto legado de 1 segmento usa 308, sin cadenas', async ({ request }) => {
    const response = await request.get(`/catalogo/${E2E_CATALOG_PRODUCT_SLUG}`, { maxRedirects: 0 });
    expect(response.status()).toBe(308);
    const location = response.headers()['location'];
    expect(location).toMatch(new RegExp(`/catalogo/lentes-opticos/${E2E_CATALOG_PRODUCT_SLUG}$`));

    // Confirma ausencia de cadenas: el destino final responde 200 directamente, sin un segundo redirect.
    const finalResponse = await request.get(location!, { maxRedirects: 0 });
    expect(finalResponse.status()).toBe(200);
  });
});
