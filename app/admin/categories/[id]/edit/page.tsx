import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireSession } from '@/modules/auth/service';
import { getCategory } from '@/modules/catalog/category-service';
import { listAttributes } from '@/modules/catalog/category-attribute-service';
import { parseCategoryCapabilities } from '@/modules/catalog/category-capabilities';
import { AdminShell } from '@/components/admin/AdminShell';
import { CategoryForm, type CategoryFormValues } from '@/components/admin/CategoryForm';
import type { CategoryAttributeView } from '../../actions';
import { updateCategoryAction } from '../../actions';

export const metadata: Metadata = { title: 'Editar categoría · Panel de administración', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;

  if (session.adminUser.role !== 'SUPERADMIN') {
    return (
      <AdminShell session={session}>
        <div className="rounded-card border border-line bg-white p-7 text-center shadow-brand-sm">
          <div className="font-semibold text-navy">Acceso restringido</div>
          <p className="mt-2 text-sm text-grafito">Solo un usuario SUPERADMIN puede editar categorías.</p>
        </div>
      </AdminShell>
    );
  }

  const [category, attributeRows] = await Promise.all([getCategory(id), listAttributes(id)]);
  if (!category) notFound();

  const initialValues: CategoryFormValues = {
    name: category.name,
    shortDescription: category.shortDescription ?? '',
    description: category.description ?? '',
    active: category.active,
    visible: category.visible,
    sortOrder: String(category.sortOrder),
    icon: category.icon ?? '',
    imagePath: category.imagePath ?? '',
    seoTitle: category.seoTitle ?? '',
    seoDescription: category.seoDescription ?? '',
    capabilities: parseCategoryCapabilities(category.capabilities),
  };

  const attributes: CategoryAttributeView[] = attributeRows.map((a) => ({
    id: a.id,
    key: a.key,
    label: a.label,
    type: a.type,
    required: a.required,
    filterable: a.filterable,
    visibleInCard: a.visibleInCard,
    visibleInDetail: a.visibleInDetail,
    sortOrder: a.sortOrder,
    options: Array.isArray(a.options) ? (a.options as string[]) : null,
    active: a.active,
  }));

  const boundUpdate = updateCategoryAction.bind(null, id);

  return (
    <AdminShell session={session}>
      <CategoryForm
        title={`Editar · ${category.name}`}
        initialValues={initialValues}
        onSubmit={boundUpdate}
        categoryId={category.id}
        attributes={attributes}
      />
    </AdminShell>
  );
}
