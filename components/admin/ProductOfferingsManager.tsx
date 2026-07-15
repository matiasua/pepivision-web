'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  createOfferingAction,
  setOfferingActiveAction,
  updateOfferingAction,
  type OfferingView,
} from '@/app/admin/products/actions';
import { StatusToast, useStatusToast } from './StatusToast';

export interface OfferingCategoryOption {
  id: string;
  name: string;
}

/**
 * "Disponibilidad en el catálogo" — habilita/edita una ProductOffering por
 * categoría para este producto. Nunca duplica colores/fotos (esas siguen
 * siendo del Product) — solo crea/edita la fila ProductOffering
 * correspondiente a cada (producto, categoría).
 */
export function ProductOfferingsManager({
  productId,
  categories,
  offerings,
}: {
  productId: string;
  categories: OfferingCategoryOption[];
  offerings: OfferingView[];
}) {
  const [byCategory, setByCategory] = useState<Record<string, OfferingView | undefined>>(
    Object.fromEntries(offerings.map((o) => [o.categoryId, o]))
  );
  const [drafts, setDrafts] = useState<Record<string, { priceFromClp: string; title: string }>>({});
  const [busyCategoryId, setBusyCategoryId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const { toast, showSuccess, showError, dismiss } = useStatusToast();
  const router = useRouter();

  function draftFor(categoryId: string) {
    return drafts[categoryId] ?? { priceFromClp: '', title: '' };
  }

  function setDraft(categoryId: string, patch: Partial<{ priceFromClp: string; title: string }>) {
    setDrafts((current) => ({ ...current, [categoryId]: { ...draftFor(categoryId), ...patch } }));
  }

  function handleEnable(categoryId: string) {
    const draft = draftFor(categoryId);
    setBusyCategoryId(categoryId);
    startTransition(async () => {
      const result = await createOfferingAction({
        productId,
        categoryId,
        title: draft.title || undefined,
        commercialDescription: undefined,
        priceFromClp: draft.priceFromClp,
        active: true,
        visible: true,
        featured: false,
        sortOrder: 0,
        seoTitle: undefined,
        seoDescription: undefined,
      });
      setBusyCategoryId(null);
      if (result.status === 'error') {
        showError(result.message);
        return;
      }
      setByCategory((current) => ({ ...current, [categoryId]: result.offering }));
      showSuccess('Producto habilitado en la categoría.');
      router.refresh();
    });
  }

  function handleSavePrice(offering: OfferingView) {
    const draft = draftFor(offering.categoryId);
    setBusyCategoryId(offering.categoryId);
    startTransition(async () => {
      const result = await updateOfferingAction(offering.id, {
        productId,
        categoryId: offering.categoryId,
        title: draft.title || offering.title || undefined,
        commercialDescription: offering.commercialDescription ?? undefined,
        priceFromClp: draft.priceFromClp !== '' ? draft.priceFromClp : offering.priceFromClp,
        active: offering.active,
        visible: offering.visible,
        featured: offering.featured,
        sortOrder: offering.sortOrder,
        seoTitle: offering.seoTitle ?? undefined,
        seoDescription: offering.seoDescription ?? undefined,
      });
      setBusyCategoryId(null);
      if (result.status === 'error') {
        showError(result.message);
        return;
      }
      setByCategory((current) => ({ ...current, [offering.categoryId]: result.offering }));
      showSuccess('Los cambios de la oferta se guardaron correctamente.');
      router.refresh();
    });
  }

  function handleToggleActive(offering: OfferingView) {
    setBusyCategoryId(offering.categoryId);
    startTransition(async () => {
      const result = await setOfferingActiveAction(offering.id, !offering.active);
      setBusyCategoryId(null);
      if (result.status === 'error') {
        showError(result.message);
        return;
      }
      setByCategory((current) => ({ ...current, [offering.categoryId]: { ...offering, active: !offering.active } }));
      showSuccess(offering.active ? 'Oferta desactivada.' : 'Oferta activada.');
      router.refresh();
    });
  }

  if (categories.length === 0) {
    return (
      <div className="rounded-input bg-gray px-3.5 py-3 text-xs text-grafito">
        No hay categorías activas todavía — un SUPERADMIN puede crearlas en /admin/categories.
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {categories.map((category) => {
        const offering = byCategory[category.id];
        const busy = busyCategoryId === category.id;

        if (!offering) {
          return (
            <div key={category.id} className="flex flex-wrap items-center gap-2.5 rounded-input border border-line p-3.5">
              <span className="min-w-[140px] text-sm font-semibold text-navy">{category.name}</span>
              <span className="text-xs text-[#5b6b85]">No habilitado en esta categoría</span>
              <input
                value={draftFor(category.id).priceFromClp}
                onChange={(e) => setDraft(category.id, { priceFromClp: e.target.value })}
                placeholder="Precio desde (vacío = Cotizar)"
                inputMode="numeric"
                aria-label={`Precio desde para ${category.name}`}
                className="ml-auto w-52 rounded-input border border-line bg-white px-3 py-2 text-sm outline-none"
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => handleEnable(category.id)}
                aria-label={`Habilitar en ${category.name}`}
                className="rounded-input bg-navy px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
              >
                {busy ? 'Habilitando…' : 'Habilitar'}
              </button>
            </div>
          );
        }

        return (
          <div key={category.id} className="rounded-input border border-line p-3.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="min-w-[140px] text-sm font-semibold text-navy">{category.name}</span>
              <button
                type="button"
                disabled={busy}
                onClick={() => handleToggleActive(offering)}
                aria-label={offering.active ? `Desactivar ${category.name}` : `Activar ${category.name}`}
                className={`text-xs font-semibold disabled:opacity-50 ${offering.active ? 'text-success' : 'text-[#5b6b85]'}`}
              >
                {offering.active ? 'Activa · desactivar' : 'Inactiva · activar'}
              </button>
              <input
                defaultValue={offering.priceFromClp != null ? String(offering.priceFromClp) : ''}
                onChange={(e) => setDraft(category.id, { priceFromClp: e.target.value })}
                placeholder="Precio desde (vacío = Cotizar)"
                inputMode="numeric"
                aria-label={`Precio desde para ${category.name}`}
                className="ml-auto w-52 rounded-input border border-line bg-white px-3 py-2 text-sm outline-none"
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => handleSavePrice(offering)}
                className="rounded-input bg-gray px-4 py-2 text-xs font-semibold text-navy disabled:opacity-60"
              >
                {busy ? 'Guardando…' : 'Guardar precio'}
              </button>
            </div>
          </div>
        );
      })}
      <StatusToast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
