import type { Metadata } from 'next';
import Link from 'next/link';
import { requireSession } from '@/modules/auth/service';
import { listCategories } from '@/modules/catalog/category-service';
import { AdminShell } from '@/components/admin/AdminShell';
import { CategoryList } from '@/components/admin/CategoryList';

export const metadata: Metadata = { title: 'Categorías · Panel de administración', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function AdminCategoriesPage() {
  const session = await requireSession();

  if (session.adminUser.role !== 'SUPERADMIN') {
    return (
      <AdminShell session={session}>
        <div className="rounded-card border border-line bg-white p-7 text-center shadow-brand-sm">
          <div className="font-semibold text-navy">Acceso restringido</div>
          <p className="mt-2 text-sm text-grafito">Solo un usuario SUPERADMIN puede administrar categorías.</p>
        </div>
      </AdminShell>
    );
  }

  const categories = await listCategories();

  return (
    <AdminShell session={session}>
      <div className="mb-5 flex justify-end">
        <Link href="/admin/categories/new" className="rounded-input bg-navy px-4.5 py-2.5 text-sm font-semibold text-white">
          + Agregar categoría
        </Link>
      </div>
      <CategoryList
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          active: c.active,
          visible: c.visible,
          sortOrder: c.sortOrder,
        }))}
      />
    </AdminShell>
  );
}
