import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireSession } from '@/modules/auth/service';
import { getProduct, listActiveBrands } from '@/modules/catalog/admin-service';
import { listCategoriesForOfferingSelector } from '@/modules/catalog/category-service';
import { listOfferingsForProductAdmin } from '@/modules/catalog/offering-service';
import { AdminShell } from '@/components/admin/AdminShell';
import { ProductForm, type ProductFormValues } from '@/components/admin/ProductForm';
import type { OfferingView } from '../../actions';
import { updateProductAction } from '../../actions';

export const metadata: Metadata = { title: 'Editar modelo · Panel de administración', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  const [product, brands, categories, offeringRows] = await Promise.all([
    getProduct(id),
    listActiveBrands(),
    listCategoriesForOfferingSelector(),
    listOfferingsForProductAdmin(id),
  ]);
  if (!product) notFound();

  const initialValues: ProductFormValues = {
    name: product.name,
    code: product.code,
    brandId: product.brandId ?? '',
    priceFromClp: String(product.priceFromClp),
    sizes: product.sizes ?? '',
    gender: product.gender,
    shape: product.shape,
    material: product.material,
    available: product.available,
    visible: product.visible,
    badge: product.badge ?? '',
    description: product.description ?? '',
    colors: product.colors.map((c) => ({ id: c.id, name: c.name, hex: c.hex })),
  };

  const boundUpdate = updateProductAction.bind(null, id);
  const images = product.images.map((image) => ({
    id: image.id,
    url: image.url,
    productColorId: image.productColorId,
    sortOrder: image.sortOrder,
    isCover: image.isCover,
  }));

  const offerings: OfferingView[] = offeringRows.map((o) => ({
    id: o.id,
    categoryId: o.categoryId,
    categoryName: o.category.name,
    title: o.title,
    commercialDescription: o.commercialDescription,
    priceFromClp: o.priceFromClp,
    active: o.active,
    visible: o.visible,
    featured: o.featured,
    sortOrder: o.sortOrder,
    seoTitle: o.seoTitle,
    seoDescription: o.seoDescription,
  }));

  return (
    <AdminShell session={session}>
      <ProductForm
        title={`Editar · ${product.name}`}
        initialValues={initialValues}
        onSubmit={boundUpdate}
        productId={product.id}
        images={images}
        brands={brands}
        offeringCategories={categories.map((c) => ({ id: c.id, name: c.name }))}
        offerings={offerings}
      />
    </AdminShell>
  );
}
