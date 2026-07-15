import type { Metadata } from 'next';
import { requireSession } from '@/modules/auth/service';
import { AdminShell } from '@/components/admin/AdminShell';
import { CategoryForm } from '@/components/admin/CategoryForm';
import { createCategoryAction } from '../actions';

export const metadata: Metadata = { title: 'Agregar categoría · Panel de administración', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function NewCategoryPage() {
  const session = await requireSession();

  if (session.adminUser.role !== 'SUPERADMIN') {
    return (
      <AdminShell session={session}>
        <div className="rounded-card border border-line bg-white p-7 text-center shadow-brand-sm">
          <div className="font-semibold text-navy">Acceso restringido</div>
          <p className="mt-2 text-sm text-grafito">Solo un usuario SUPERADMIN puede crear categorías.</p>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell session={session}>
      <CategoryForm title="Agregar categoría" onSubmit={createCategoryAction} />
    </AdminShell>
  );
}
