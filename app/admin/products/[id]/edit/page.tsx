import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireSession } from '@/modules/auth/service';
import { getProduct } from '@/modules/catalog/admin-service';
import { AdminShell } from '@/components/admin/AdminShell';
import { ProductForm, type ProductFormValues } from '@/components/admin/ProductForm';
import { updateProductAction } from '../../actions';

export const metadata: Metadata = { title: 'Editar modelo · Panel de administración', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();

  const initialValues: ProductFormValues = {
    name: product.name,
    code: product.code,
    priceFromClp: String(product.priceFromClp),
    sizes: product.sizes ?? '',
    gender: product.gender,
    shape: product.shape,
    material: product.material,
    available: product.available,
    visible: product.visible,
    badge: product.badge ?? '',
    description: product.description ?? '',
    colors: product.colors.map((c) => ({ name: c.name, hex: c.hex })),
  };

  const boundUpdate = updateProductAction.bind(null, id);

  return (
    <AdminShell session={session}>
      <ProductForm title={`Editar · ${product.name}`} initialValues={initialValues} onSubmit={boundUpdate} />
    </AdminShell>
  );
}
