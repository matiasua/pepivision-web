// Runs once before the whole Playwright run. Provisions dedicated E2E-only
// admin accounts directly via Prisma (never over HTTP, never hardcoded) —
// exactly the same real DB the browser-driven tests hit through nginx.
// Credentials are generated fresh every run (crypto.randomBytes, never a
// fixed value) and written to e2e/.auth/e2e-fixtures.json, which is
// gitignored and deleted again by global-teardown.ts — never checked in,
// never printed to a shared log.
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { AdminRole, Gender, ProductMaterial, ProductShape } from '@prisma/client';
import { HeadObjectCommand } from '@aws-sdk/client-s3';
import { env } from '../lib/env';
import { prisma } from '../lib/prisma';
import { hashPassword } from '../modules/auth/password';
import { processProductImage } from '../lib/image-processing';
import { buildPublicUrl, buildStorageKey, deleteObject, uploadObject } from '../modules/storage/service';
import { s3Client } from '../modules/storage/client';
import { tinySolidPngBuffer } from './fixtures/files';
import { E2E_CATALOG_PRODUCT_SLUG } from './fixtures/test-data';

const FIXTURES_PATH = path.join(__dirname, '.auth', 'e2e-fixtures.json');
// Fixed (not per-run random) on purpose — e2e/public/catalog.spec.ts
// addresses this exact product by slug directly, so it must be a known
// constant rather than something only discoverable via the fixtures file.
const E2E_CATALOG_PRODUCT_CODE = 'E2E-FIXTURE-GALERIA';

function randomPassword(): string {
  return `E2e-${randomBytes(12).toString('hex')}!`;
}

function tag(prefix: string): string {
  return `${prefix}_${randomBytes(4).toString('hex')}`;
}

/**
 * Idempotency: a previous run that crashed mid-way (or was force-cancelled)
 * can leave this exact fixture behind. Reconciles by fully removing any
 * prior instance — MinIO objects first (never DB-cascaded), then the row
 * itself (ProductColor/ProductImage cascade-delete with it) — before
 * creating a fresh one, so re-running this script is always safe and never
 * duplicates or double-uploads.
 */
async function reconcileExistingCatalogFixture() {
  const existing = await prisma.product.findUnique({
    where: { slug: E2E_CATALOG_PRODUCT_SLUG },
    include: { images: true },
  });
  if (!existing) return;

  await Promise.all(existing.images.map((image) => deleteObject(image.storageKey).catch(() => undefined)));
  await prisma.product.delete({ where: { id: existing.id } });
}

/**
 * Provisions one real, physically-uploaded product photo pair for
 * e2e/public/catalog.spec.ts's gallery/lightbox coverage — a
 * ProductImage row alone isn't enough, since the public page renders the
 * real MinIO-hosted URL. Uses the exact same storage service functions
 * (buildStorageKey/uploadObject/buildPublicUrl) the real admin upload flow
 * uses (modules/catalog/admin-service.ts#uploadProductImage), so this is
 * the same public-URL path the app itself produces, not a parallel one.
 */
async function createCatalogFixture() {
  await reconcileExistingCatalogFixture();

  const product = await prisma.product.create({
    data: {
      name: 'E2E Fixture — Catálogo',
      code: E2E_CATALOG_PRODUCT_CODE,
      slug: E2E_CATALOG_PRODUCT_SLUG,
      brandId: null,
      gender: Gender.UNISEX,
      shape: ProductShape.REDONDO,
      material: ProductMaterial.ACETATO,
      priceFromClp: 19990, // valid V1 reference price, per the price-compatibility phase
      available: true,
      visible: true,
    },
  });

  // Desde redesign-extensible-catalog-v2, la lectura pública del catálogo
  // pasa a ser por ProductOffering — un Product visible sin ninguna oferta
  // pública simplemente no aparece en ningún lado (ver design.md → "Fase de
  // compatibilidad de precios"). "lentes-opticos" existe siempre en este
  // punto (categoría definitiva post-migración de taxonomía, Fase 5): el
  // seed (`prisma db seed`) corre antes que la suite E2E, ver README.md.
  const opticalCategory = await prisma.category.findUniqueOrThrow({ where: { slug: 'lentes-opticos' } });
  const offering = await prisma.productOffering.create({
    data: {
      productId: product.id,
      categoryId: opticalCategory.id,
      slug: E2E_CATALOG_PRODUCT_SLUG,
      priceFromClp: product.priceFromClp,
      active: true,
      visible: true,
    },
  });

  const color = await prisma.productColor.create({
    data: { productId: product.id, name: 'E2E Negro', hex: '#1c1c22' },
  });

  const storageKeys: string[] = [];
  const imageIds: string[] = [];

  const swatches: [{ r: number; g: number; b: number }, boolean][] = [
    [{ r: 20, g: 20, b: 30 }, true], // cover
    [{ r: 200, g: 60, b: 120 }, false], // visually distinct second photo
  ];

  for (const [index, [background, isCover]] of swatches.entries()) {
    const raw = await tinySolidPngBuffer(background);
    const processed = await processProductImage(raw);
    const storageKey = buildStorageKey(product.id, 'e2e', processed.extension);
    await uploadObject({ key: storageKey, body: processed.buffer, contentType: processed.contentType });
    storageKeys.push(storageKey);

    const image = await prisma.productImage.create({
      data: {
        productId: product.id,
        productColorId: color.id,
        storageKey,
        url: buildPublicUrl(storageKey),
        width: processed.width,
        height: processed.height,
        sortOrder: index,
        isCover,
      },
    });
    imageIds.push(image.id);
  }

  // Sanity check: the objects genuinely exist in the bucket, resolvable via
  // the Docker-internal endpoint (the same one uploadObject/deleteObject
  // use) — not just DB rows pointing at nothing. Throws (failing the whole
  // setup loudly) if a HEAD request doesn't find the object.
  for (const key of storageKeys) {
    await s3Client.send(new HeadObjectCommand({ Bucket: env.OBJECT_STORAGE_BUCKET, Key: key }));
  }

  return {
    id: product.id,
    slug: product.slug,
    colorId: color.id,
    imageIds,
    storageKeys,
    categorySlug: opticalCategory.slug,
    offeringSlug: offering.slug,
  };
}

export default async function globalSetup() {
  const superadminTag = tag('e2e_super');
  const superadminPassword = randomPassword();
  const superadmin = await prisma.adminUser.create({
    data: {
      email: `${superadminTag}@e2e.test.pepivision360.invalid`,
      username: superadminTag,
      name: 'E2E Superadmin',
      passwordHash: await hashPassword(superadminPassword),
      role: AdminRole.SUPERADMIN,
      active: true,
    },
  });

  const adminTag = tag('e2e_admin');
  const adminPassword = randomPassword();
  const admin = await prisma.adminUser.create({
    data: {
      email: `${adminTag}@e2e.test.pepivision360.invalid`,
      username: adminTag,
      name: 'E2E Admin',
      passwordHash: await hashPassword(adminPassword),
      role: AdminRole.ADMIN,
      active: true,
    },
  });

  // A dedicated, uniquely-named enabled comuna so the home-visit "covered"
  // flow doesn't depend on the exact contents of the dev seed data.
  const comunaName = tag('E2E Comuna');
  const comuna = await prisma.enabledComuna.create({ data: { name: comunaName, active: true } });

  const catalogProduct = await createCatalogFixture();

  await mkdir(path.dirname(FIXTURES_PATH), { recursive: true });
  await writeFile(
    FIXTURES_PATH,
    JSON.stringify(
      {
        superadmin: { id: superadmin.id, email: superadmin.email, username: superadmin.username, password: superadminPassword },
        admin: { id: admin.id, email: admin.email, username: admin.username, password: adminPassword },
        comuna: { id: comuna.id, name: comuna.name },
        catalogProduct,
      },
      null,
      2
    )
  );

  await prisma.$disconnect();
}
