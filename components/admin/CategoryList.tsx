'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  deleteCategoryAction,
  reorderCategoriesAction,
  setCategoryActiveAction,
} from '@/app/admin/categories/actions';
import { ConfirmDeleteButton } from './ConfirmDeleteButton';
import { StatusToast, useStatusToast } from './StatusToast';

export interface CategoryListItem {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  visible: boolean;
  sortOrder: number;
}

export function CategoryList({ categories }: { categories: CategoryListItem[] }) {
  const [items, setItems] = useState(categories);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<{ categoryId: string; name: string; offeringCount: number } | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast, showSuccess, showError, dismiss } = useStatusToast();
  const router = useRouter();

  function move(categoryId: string, direction: -1 | 1) {
    const index = items.findIndex((c) => c.id === categoryId);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= items.length) return;

    const reordered = [...items];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    const orderedCategoryIds = reordered.map((c) => c.id);
    const previous = items;

    setItems(reordered.map((c, i) => ({ ...c, sortOrder: i })));
    setBusyId(categoryId);
    startTransition(async () => {
      const result = await reorderCategoriesAction(orderedCategoryIds);
      setBusyId(null);
      if (result.status === 'error') {
        setItems(previous);
        showError(result.message);
        return;
      }
      showSuccess('El orden se actualizó correctamente.');
      router.refresh();
    });
  }

  function toggleActive(category: CategoryListItem) {
    setBusyId(category.id);
    startTransition(async () => {
      const result = await setCategoryActiveAction(category.id, !category.active);
      setBusyId(null);
      if (result.status === 'error') {
        showError(result.message);
        return;
      }
      setItems((current) => current.map((c) => (c.id === category.id ? { ...c, active: !category.active } : c)));
      showSuccess(category.active ? 'Categoría desactivada.' : 'Categoría activada.');
      router.refresh();
    });
  }

  async function handleDelete(category: CategoryListItem) {
    const result = await deleteCategoryAction(category.id);
    if (result.status === 'error') {
      showError(result.message);
      return;
    }
    if (result.status === 'blocked') {
      setBlocked({ categoryId: category.id, name: category.name, offeringCount: result.offeringCount });
      return;
    }
    setItems((current) => current.filter((c) => c.id !== category.id));
    showSuccess('Categoría eliminada correctamente.');
    router.refresh();
  }

  return (
    <div className="overflow-hidden overflow-x-auto rounded-card border border-line bg-white shadow-brand-sm">
      <table className="w-full min-w-[720px] border-collapse">
        <thead>
          <tr className="bg-gray text-left text-[11.5px] font-bold uppercase tracking-wide text-[#5b6b85]">
            <th className="px-4.5 py-3.5">Orden</th>
            <th className="px-4.5 py-3.5">Categoría</th>
            <th className="px-4.5 py-3.5">Estado</th>
            <th className="px-4.5 py-3.5">Visibilidad</th>
            <th className="px-4.5 py-3.5 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {items.map((category, index) => {
            const busy = busyId === category.id || isPending;
            return (
              <tr key={category.id} className="border-t border-line align-middle">
                <td className="px-4.5 py-3.5">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      disabled={busy || index === 0}
                      onClick={() => move(category.id, -1)}
                      aria-label={`Mover ${category.name} antes`}
                      className="flex h-8 w-8 items-center justify-center rounded-md bg-gray text-xs font-bold text-navy disabled:opacity-30"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      disabled={busy || index === items.length - 1}
                      onClick={() => move(category.id, 1)}
                      aria-label={`Mover ${category.name} después`}
                      className="flex h-8 w-8 items-center justify-center rounded-md bg-gray text-xs font-bold text-navy disabled:opacity-30"
                    >
                      ▼
                    </button>
                  </div>
                </td>
                <td className="px-4.5 py-3.5">
                  <Link href={`/admin/categories/${category.id}/edit`} className="font-display font-semibold text-navy hover:text-fucsia">
                    {category.name}
                  </Link>
                  <div className="text-xs text-[#5b6b85]">/{category.slug}</div>
                </td>
                <td className="px-4.5 py-3.5">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => toggleActive(category)}
                    className={`text-xs font-semibold disabled:opacity-50 ${category.active ? 'text-success' : 'text-[#5b6b85]'}`}
                  >
                    {category.active ? 'Activa · desactivar' : 'Inactiva · activar'}
                  </button>
                </td>
                <td className="px-4.5 py-3.5">
                  <span className={`text-xs font-semibold ${category.visible ? 'text-navy' : 'text-[#5b6b85]'}`}>
                    {category.visible ? 'Visible' : 'Oculta'}
                  </span>
                </td>
                <td className="px-4.5 py-3.5 text-right">
                  {blocked?.categoryId === category.id ? (
                    <div className="inline-block rounded-2xl border border-[#f3c6d3] bg-error-bg p-3 text-left">
                      <p className="text-xs font-semibold text-error">
                        No puede eliminarse: tiene {blocked.offeringCount}{' '}
                        {blocked.offeringCount === 1 ? 'oferta asociada' : 'ofertas asociadas'}.
                      </p>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            toggleActive(category);
                            setBlocked(null);
                          }}
                          className="rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-white"
                        >
                          Desactivar en su lugar
                        </button>
                        <button
                          type="button"
                          onClick={() => setBlocked(null)}
                          className="rounded-lg bg-gray px-3 py-1.5 text-xs font-semibold text-grafito"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <ConfirmDeleteButton action={() => handleDelete(category)} />
                  )}
                </td>
              </tr>
            );
          })}
          {items.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4.5 py-10 text-center text-sm text-grafito">
                No hay categorías creadas todavía.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
      <StatusToast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
