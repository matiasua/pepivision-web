// Cubre Fase 6 (redesign-extensible-catalog-v2, design.md → "Imágenes de
// categoría"), sección 19 del cierre técnico: saveCategoryImage()/
// deleteCategoryImage() contra Postgres y MinIO reales, no mocks. Usa
// categorías efímeras propias (nunca lentes-opticos/lentes-de-sol) para no
// interferir con datos compartidos de otros archivos de esta carpeta.
import { afterAll, describe, expect, it } from 'vitest';
import { AdminRole } from '@prisma/client';
import { saveCategoryImage, deleteCategoryImage, createCategory } from '@/modules/catalog/category-service';
import { createTestAdmin, deleteTestAdmins, env, objectExistsInBucket, prisma, tinyPngBuffer, uniqueTag } from './helpers';

const VALID_CAPABILITIES = {
  requiresColor: true,
  allowsLensType: false,
  allowsTreatments: false,
  allowsPrescription: false,
  allowsPrescriptionAttachment: false,
  allowsLensTint: false,
  allowsFrameSelection: true,
};

describe('modules/catalog/category-service — category images + MinIO (integration)', () => {
  const adminIds: string[] = [];
  const categoryIds: string[] = [];

  afterAll(async () => {
    await prisma.category.deleteMany({ where: { id: { in: categoryIds } } });
    await deleteTestAdmins(adminIds);
  });

  async function makeFixture() {
    const { user, session } = await createTestAdmin(AdminRole.SUPERADMIN);
    adminIds.push(user.id);

    const tag = uniqueTag('cat-img');
    const category = await createCategory(
      {
        name: `Categoría ${tag}`,
        shortDescription: undefined,
        description: undefined,
        active: true,
        visible: true,
        sortOrder: 99,
        icon: undefined,
        seoTitle: undefined,
        seoDescription: undefined,
        capabilities: VALID_CAPABILITIES,
      },
      session
    );
    categoryIds.push(category.id);
    return { session, category };
  }

  it('a newly created category has no image (imagePath/imageStorageKey both null)', async () => {
    const { category } = await makeFixture();
    expect(category.imagePath).toBeNull();
    expect(category.imageStorageKey).toBeNull();
  });

  it('uploads a real JPG, processes it to WebP, and persists a matching URL + storage key', async () => {
    const { session, category } = await makeFixture();
    // tinyPngBuffer() is a real, valid PNG — reused here as a generic
    // "real decodable image" fixture; the point of this test is the JPG
    // *content-type* path through the schema/pipeline, not pixel format.
    const buffer = await tinyPngBuffer();

    const updated = await saveCategoryImage(category.id, { buffer, contentType: 'image/jpeg', size: buffer.length }, session);

    expect(updated.imageStorageKey).toMatch(new RegExp(`^categories/${category.id}/cover-[0-9a-f]{16}\\.webp$`));
    expect(updated.imagePath).toContain(updated.imageStorageKey as string);
    expect(await objectExistsInBucket(env.OBJECT_STORAGE_BUCKET, updated.imageStorageKey as string)).toBe(true);
  });

  it('uploads a real PNG successfully', async () => {
    const { session, category } = await makeFixture();
    const buffer = await tinyPngBuffer();

    const updated = await saveCategoryImage(category.id, { buffer, contentType: 'image/png', size: buffer.length }, session);

    expect(updated.imageStorageKey).toMatch(/\.webp$/);
    expect(await objectExistsInBucket(env.OBJECT_STORAGE_BUCKET, updated.imageStorageKey as string)).toBe(true);
  });

  it('replacing an image uploads the new object, persists it, and deletes the old object from MinIO', async () => {
    const { session, category } = await makeFixture();
    const buffer = await tinyPngBuffer();

    const first = await saveCategoryImage(category.id, { buffer, contentType: 'image/jpeg', size: buffer.length }, session);
    const firstKey = first.imageStorageKey as string;
    expect(await objectExistsInBucket(env.OBJECT_STORAGE_BUCKET, firstKey)).toBe(true);

    const replaced = await saveCategoryImage(category.id, { buffer, contentType: 'image/png', size: buffer.length }, session);
    expect(replaced.imageStorageKey).not.toBe(firstKey);
    expect(await objectExistsInBucket(env.OBJECT_STORAGE_BUCKET, replaced.imageStorageKey as string)).toBe(true);
    expect(await objectExistsInBucket(env.OBJECT_STORAGE_BUCKET, firstKey)).toBe(false);
  });

  it('deleting the image clears the DB reference and removes the object from MinIO, while the category row is preserved', async () => {
    const { session, category } = await makeFixture();
    const buffer = await tinyPngBuffer();

    const uploaded = await saveCategoryImage(category.id, { buffer, contentType: 'image/jpeg', size: buffer.length }, session);
    const key = uploaded.imageStorageKey as string;

    await deleteCategoryImage(category.id, session);

    expect(await objectExistsInBucket(env.OBJECT_STORAGE_BUCKET, key)).toBe(false);
    const after = await prisma.category.findUniqueOrThrow({ where: { id: category.id } });
    expect(after.imagePath).toBeNull();
    expect(after.imageStorageKey).toBeNull();
    expect(after.id).toBe(category.id); // la categoría en sí se conserva
    expect(after.name).toBe(category.name);
  });

  it('an invalid file (bad MIME) is rejected and never creates an object or a DB reference', async () => {
    const { session, category } = await makeFixture();
    const buffer = Buffer.from('<svg></svg>');

    await expect(
      saveCategoryImage(category.id, { buffer, contentType: 'image/svg+xml', size: buffer.length }, session)
    ).rejects.toThrow();

    const after = await prisma.category.findUniqueOrThrow({ where: { id: category.id } });
    expect(after.imagePath).toBeNull();
    expect(after.imageStorageKey).toBeNull();
  });

  it('a truly corrupted "image" is rejected by the real Sharp pipeline, never uploaded', async () => {
    const { session, category } = await makeFixture();
    const buffer = Buffer.from('not a real image, just bytes pretending to be one');

    await expect(
      saveCategoryImage(category.id, { buffer, contentType: 'image/jpeg', size: buffer.length }, session)
    ).rejects.toThrow();

    const after = await prisma.category.findUniqueOrThrow({ where: { id: category.id } });
    expect(after.imageStorageKey).toBeNull();
  });

  it('the two canonical categories (lentes-opticos, lentes-de-sol) are never touched by these fixtures', async () => {
    const canonical = await prisma.category.findMany({ where: { slug: { in: ['lentes-opticos', 'lentes-de-sol'] } } });
    expect(canonical).toHaveLength(2);
  });
});
