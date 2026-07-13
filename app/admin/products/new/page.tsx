import type { Metadata } from 'next';
import { requireSession } from '@/modules/auth/service';
import { AdminShell } from '@/components/admin/AdminShell';
import { ProductForm } from '@/components/admin/ProductForm';
import { createProductAction } from '../actions';

export const metadata: Metadata = { title: 'Agregar modelo · Panel de administración', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function NewProductPage() {
  const session = await requireSession();

  return (
    <AdminShell session={session}>
      <ProductForm title="Agregar modelo" onSubmit={createProductAction} />
    </AdminShell>
  );
}
