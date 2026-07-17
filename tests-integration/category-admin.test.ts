// Cubre Fase 4, tarea 4.6: eliminar una categoría con ofertas asociadas
// queda bloqueado; desactivarla funciona. Real Postgres via Prisma (real
// Category + real Product + real ProductOffering), no mocks. Usa una
// categoría efímera propia (no una de las tres sembradas en la Fase 2)
// para no interferir con otros archivos que reutilizan esas como fixture
// compartido.
import { afterAll, describe, expect, it } from 'vitest';
import { AdminRole, Gender, ProductMaterial, ProductShape } from '@prisma/client';
import { createProduct } from '@/modules/catalog/admin-service';
import { createCategory, deleteCategory, setCategoryActive } from '@/modules/catalog/category-service';
import { createOffering } from '@/modules/catalog/offering-service';
import { createTestAdmin, deleteTestAdmins, prisma, uniqueTag } from './helpers';

describe('modules/catalog/category-service — delete/deactivate with real ProductOffering (4.6)', () => {
  const adminIds: string[] = [];
  const brandIds: string[] = [];
  const productIds: string[] = [];
  const offeringIds: string[] = [];
  const categoryIds: string[] = [];

  afterAll(async () => {
    await prisma.productOffering.deleteMany({ where: { id: { in: offeringIds } } });
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
    await prisma.brand.deleteMany({ where: { id: { in: brandIds } } });
    await prisma.category.deleteMany({ where: { id: { in: categoryIds } } });
    await deleteTestAdmins(adminIds);
  });

  it('blocks deletion of a category with an associated offering, and deactivating it works instead', async () => {
    const { user, session: superadmin } = await createTestAdmin(AdminRole.SUPERADMIN);
    adminIds.push(user.id);

    const tag = uniqueTag('cat');
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
        capabilities: {
          requiresColor: true,
          allowsLensType: false,
          allowsTreatments: false,
          allowsPrescription: false,
          allowsPrescriptionAttachment: false,
          allowsLensTint: false,
          allowsFrameSelection: true,
        },
      },
      superadmin
    );
    categoryIds.push(category.id);

    const brand = await prisma.brand.create({ data: { name: tag, slug: tag, active: true } });
    brandIds.push(brand.id);
    const product = await createProduct(
      {
        name: `Modelo ${tag}`,
        code: tag,
        brandId: brand.id,
        priceFromClp: 19990,
        sizes: undefined,
        gender: Gender.UNISEX,
        shape: ProductShape.REDONDO,
        material: ProductMaterial.ACETATO,
        available: true,
        visible: true,
        badge: undefined,
        description: undefined,
        colors: [],
      },
      superadmin
    );
    productIds.push(product.id);

    const offering = await createOffering(
      {
        productId: product.id,
        categoryId: category.id,
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
      superadmin
    );
    offeringIds.push(offering.id);

    // Eliminar queda bloqueado — la categoría y la oferta permanecen sin cambios.
    const deleteResult = await deleteCategory(category.id);
    expect(deleteResult).toEqual({ status: 'blocked', offeringCount: 1 });

    const categoryAfterBlockedDelete = await prisma.category.findUniqueOrThrow({ where: { id: category.id } });
    expect(categoryAfterBlockedDelete).not.toBeNull();
    const offeringAfterBlockedDelete = await prisma.productOffering.findUniqueOrThrow({ where: { id: offering.id } });
    expect(offeringAfterBlockedDelete.deletedAt).toBeNull();

    // Desactivar sí funciona — la categoría y la oferta siguen existiendo, solo cambia `active`.
    await setCategoryActive(category.id, false, superadmin);

    const categoryAfterDeactivate = await prisma.category.findUniqueOrThrow({ where: { id: category.id } });
    expect(categoryAfterDeactivate.active).toBe(false);
    const offeringAfterDeactivate = await prisma.productOffering.findUniqueOrThrow({ where: { id: offering.id } });
    expect(offeringAfterDeactivate.active).toBe(true); // la oferta en sí no se toca al desactivar la categoría
  });
});
