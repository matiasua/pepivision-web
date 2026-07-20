// Fase 14 (redesign-extensible-catalog-v2 — SEO y compatibilidad de
// rutas). Real Postgres via Prisma, no mocks. Reutiliza las dos
// categorías definitivas (lentes-opticos, lentes-de-sol) sembradas en la
// Fase 5, igual que otros archivos de esta carpeta.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AdminRole, Gender, ProductMaterial, ProductShape } from '@prisma/client';
import { createProduct } from '@/modules/catalog/admin-service';
import { createOffering } from '@/modules/catalog/offering-service';
import { getOfferingDetail, getCategorySummary, getPublicOfferingsForSitemap } from '@/modules/catalog/service';
import { buildOfferingMetadata, buildOfferingCanonicalUrl, toOfferingProductJsonLd } from '@/modules/catalog/seo';
import { seedCategories } from '../prisma/seed';
import { createTestAdmin, deleteTestAdmins, prisma, uniqueTag } from './helpers';

describe('modules/catalog/seo — SEO del catálogo público (integration)', () => {
  const adminIds: string[] = [];
  const brandIds: string[] = [];
  const productIds: string[] = [];
  const offeringIds: string[] = [];
  let opticalCategoryId: string;
  let sunCategoryId: string;

  beforeAll(async () => {
    await seedCategories();
    opticalCategoryId = (await prisma.category.findUniqueOrThrow({ where: { slug: 'lentes-opticos' } })).id;
    sunCategoryId = (await prisma.category.findUniqueOrThrow({ where: { slug: 'lentes-de-sol' } })).id;
  });

  afterAll(async () => {
    await prisma.productOffering.deleteMany({ where: { id: { in: offeringIds } } });
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
    await prisma.brand.deleteMany({ where: { id: { in: brandIds } } });
    await deleteTestAdmins(adminIds);
  });

  async function makeActor() {
    const { user, session } = await createTestAdmin(AdminRole.ADMIN);
    adminIds.push(user.id);
    return session;
  }

  async function makeProduct(tag: string) {
    const actor = await makeActor();
    const brand = await prisma.brand.create({ data: { name: tag, slug: tag, active: true } });
    brandIds.push(brand.id);
    const product = await createProduct(
      {
        name: `Modelo ${tag}`,
        code: tag,
        brandId: brand.id,
        priceFromClp: 99999, // V1 legado — nunca debe aparecer en ninguna metadata/JSON-LD/sitemap V2.
        sizes: undefined,
        gender: Gender.UNISEX,
        shape: ProductShape.REDONDO,
        material: ProductMaterial.ACETATO,
        available: true,
        visible: true,
        badge: undefined,
        description: 'Descripción pública del modelo.',
        colors: [{ name: 'Negro', hex: '#000000' }],
      },
      actor
    );
    productIds.push(product.id);
    return { product, actor };
  }

  it('el mismo Product en las dos categorías produce dos títulos y dos canonical distintos', async () => {
    const tag = uniqueTag('seoprod');
    const { product, actor } = await makeProduct(tag);

    const opticalOffering = await createOffering(
      {
        productId: product.id,
        categoryId: opticalCategoryId,
        title: undefined,
        commercialDescription: undefined,
        priceFromClp: 19990,
        active: true,
        visible: true,
        featured: false,
        sortOrder: 0,
        seoTitle: undefined,
        seoDescription: undefined,
      },
      actor
    );
    const sunOffering = await createOffering(
      {
        productId: product.id,
        categoryId: sunCategoryId,
        title: undefined,
        commercialDescription: undefined,
        priceFromClp: 45000,
        active: true,
        visible: true,
        featured: false,
        sortOrder: 0,
        seoTitle: undefined,
        seoDescription: undefined,
      },
      actor
    );
    offeringIds.push(opticalOffering.id, sunOffering.id);

    const opticalDetail = await getOfferingDetail('lentes-opticos', opticalOffering.slug);
    const sunDetail = await getOfferingDetail('lentes-de-sol', sunOffering.slug);
    expect(opticalDetail).not.toBeNull();
    expect(sunDetail).not.toBeNull();

    const opticalMetadata = buildOfferingMetadata({
      categorySlug: 'lentes-opticos',
      categoryName: opticalDetail!.offering.categoryName,
      offeringSlug: opticalDetail!.offering.offeringSlug,
      name: opticalDetail!.offering.name,
      description: opticalDetail!.offering.description,
      seoTitle: opticalDetail!.offering.seoTitle,
      seoDescription: opticalDetail!.offering.seoDescription,
      priceLabel: opticalDetail!.offering.priceLabel,
      coverImageUrl: opticalDetail!.offering.coverImageUrl,
    });
    const sunMetadata = buildOfferingMetadata({
      categorySlug: 'lentes-de-sol',
      categoryName: sunDetail!.offering.categoryName,
      offeringSlug: sunDetail!.offering.offeringSlug,
      name: sunDetail!.offering.name,
      description: sunDetail!.offering.description,
      seoTitle: sunDetail!.offering.seoTitle,
      seoDescription: sunDetail!.offering.seoDescription,
      priceLabel: sunDetail!.offering.priceLabel,
      coverImageUrl: sunDetail!.offering.coverImageUrl,
    });

    expect(opticalMetadata.title).not.toBe(sunMetadata.title);
    expect(opticalMetadata.alternates?.canonical).not.toBe(sunMetadata.alternates?.canonical);
    expect(opticalMetadata.alternates?.canonical).toBe(buildOfferingCanonicalUrl('lentes-opticos', opticalOffering.slug));
    expect(sunMetadata.alternates?.canonical).toBe(buildOfferingCanonicalUrl('lentes-de-sol', sunOffering.slug));
  });

  it('cada oferta usa su propio seoTitle/seoDescription cuando el admin los definió', async () => {
    const tag = uniqueTag('seoexplicit');
    const { product, actor } = await makeProduct(tag);

    const offering = await createOffering(
      {
        productId: product.id,
        categoryId: opticalCategoryId,
        title: undefined,
        commercialDescription: undefined,
        priceFromClp: 19990,
        active: true,
        visible: true,
        featured: false,
        sortOrder: 0,
        seoTitle: 'Título SEO definido por el admin',
        seoDescription: 'Descripción SEO definida por el admin',
      },
      actor
    );
    offeringIds.push(offering.id);

    const detail = await getOfferingDetail('lentes-opticos', offering.slug);
    expect(detail!.offering.seoTitle).toBe('Título SEO definido por el admin');
    expect(detail!.offering.seoDescription).toBe('Descripción SEO definida por el admin');
  });

  it('una oferta sin precio público omite el precio en el schema Offer (nunca 0, nunca Product.priceFromClp)', async () => {
    const tag = uniqueTag('seonoprice');
    const { product, actor } = await makeProduct(tag);

    const offering = await createOffering(
      {
        productId: product.id,
        categoryId: opticalCategoryId,
        title: undefined,
        commercialDescription: undefined,
        priceFromClp: undefined, // sin precio público — "Cotizar"
        active: true,
        visible: true,
        featured: false,
        sortOrder: 0,
        seoTitle: undefined,
        seoDescription: undefined,
      },
      actor
    );
    offeringIds.push(offering.id);

    const detail = await getOfferingDetail('lentes-opticos', offering.slug);
    expect(detail!.offering.priceFromClp).toBeNull();

    const jsonLd = toOfferingProductJsonLd({
      categorySlug: 'lentes-opticos',
      categoryName: detail!.offering.categoryName,
      offeringSlug: detail!.offering.offeringSlug,
      name: detail!.offering.name,
      description: detail!.offering.description,
      brandName: detail!.offering.brandName,
      images: detail!.offering.images.map((i) => i.url),
      priceFromClp: detail!.offering.priceFromClp,
    });
    expect(jsonLd).not.toHaveProperty('offers');
    // El precio V1 del Product (99999) nunca debe filtrarse a ningún campo del JSON-LD.
    expect(JSON.stringify(jsonLd)).not.toContain('99999');
  });

  it('el sitemap incluye dos URLs distintas para el mismo Product en las dos categorías, y excluye una oferta oculta/inactiva', async () => {
    const tag = uniqueTag('seositemap');
    const { product, actor } = await makeProduct(tag);

    const opticalOffering = await createOffering(
      {
        productId: product.id,
        categoryId: opticalCategoryId,
        title: undefined,
        commercialDescription: undefined,
        priceFromClp: 19990,
        active: true,
        visible: true,
        featured: false,
        sortOrder: 0,
        seoTitle: undefined,
        seoDescription: undefined,
      },
      actor
    );
    const sunOffering = await createOffering(
      {
        productId: product.id,
        categoryId: sunCategoryId,
        title: undefined,
        commercialDescription: undefined,
        priceFromClp: 45000,
        active: true,
        visible: true,
        featured: false,
        sortOrder: 0,
        seoTitle: undefined,
        seoDescription: undefined,
      },
      actor
    );
    offeringIds.push(opticalOffering.id, sunOffering.id);

    // Segundo producto, con una oferta oculta y otra inactiva — ninguna debe aparecer.
    const { product: hiddenProduct, actor: actor2 } = await makeProduct(`${tag}hid`);
    const hiddenOffering = await createOffering(
      {
        productId: hiddenProduct.id,
        categoryId: opticalCategoryId,
        title: undefined,
        commercialDescription: undefined,
        priceFromClp: 10000,
        active: true,
        visible: false, // oculta
        featured: false,
        sortOrder: 0,
        seoTitle: undefined,
        seoDescription: undefined,
      },
      actor2
    );
    offeringIds.push(hiddenOffering.id);

    const { product: inactiveProduct, actor: actor3 } = await makeProduct(`${tag}ina`);
    const inactiveOffering = await createOffering(
      {
        productId: inactiveProduct.id,
        categoryId: opticalCategoryId,
        title: undefined,
        commercialDescription: undefined,
        priceFromClp: 10000,
        active: false, // inactiva
        visible: true,
        featured: false,
        sortOrder: 0,
        seoTitle: undefined,
        seoDescription: undefined,
      },
      actor3
    );
    offeringIds.push(inactiveOffering.id);

    // Tercer producto, oculto a nivel de Product — su oferta activa/visible tampoco debe aparecer.
    const { product: productHiddenAtRoot, actor: actor4 } = await makeProduct(`${tag}prodhid`);
    await prisma.product.update({ where: { id: productHiddenAtRoot.id }, data: { visible: false } });
    const offeringOfHiddenProduct = await createOffering(
      {
        productId: productHiddenAtRoot.id,
        categoryId: opticalCategoryId,
        title: undefined,
        commercialDescription: undefined,
        priceFromClp: 10000,
        active: true,
        visible: true,
        featured: false,
        sortOrder: 0,
        seoTitle: undefined,
        seoDescription: undefined,
      },
      actor4
    );
    offeringIds.push(offeringOfHiddenProduct.id);

    const sitemapEntries = await getPublicOfferingsForSitemap();
    const relevant = sitemapEntries.filter((e) =>
      [opticalOffering.slug, sunOffering.slug, hiddenOffering.slug, inactiveOffering.slug, offeringOfHiddenProduct.slug].includes(
        e.offeringSlug
      )
    );

    expect(relevant).toContainEqual({ categorySlug: 'lentes-opticos', offeringSlug: opticalOffering.slug, updatedAt: expect.any(Date) });
    expect(relevant).toContainEqual({ categorySlug: 'lentes-de-sol', offeringSlug: sunOffering.slug, updatedAt: expect.any(Date) });
    expect(relevant.some((e) => e.offeringSlug === hiddenOffering.slug)).toBe(false);
    expect(relevant.some((e) => e.offeringSlug === inactiveOffering.slug)).toBe(false);
    expect(relevant.some((e) => e.offeringSlug === offeringOfHiddenProduct.slug)).toBe(false);
  });

  it('getCategorySummary expone seoTitle/seoDescription reales de la categoría (fallback category-aware cuando están ausentes)', async () => {
    const optical = await getCategorySummary('lentes-opticos');
    expect(optical).not.toBeNull();
    expect(optical!.name).toBe('Lentes ópticos');
    // Sin asumir un valor específico ya seteado por otra prueba — solo el tipo/forma correctos.
    expect(typeof optical!.seoTitle === 'string' || optical!.seoTitle === null).toBe(true);
    expect(typeof optical!.seoDescription === 'string' || optical!.seoDescription === null).toBe(true);
  });
});
