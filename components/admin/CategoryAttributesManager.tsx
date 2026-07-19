'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CategoryAttributeType } from '@prisma/client';
import {
  createCategoryAttributeAction,
  deleteCategoryAttributeAction,
  type CategoryAttributeView,
} from '@/app/admin/categories/actions';
import { ConfirmDeleteButton } from './ConfirmDeleteButton';
import { StatusToast, useStatusToast } from './StatusToast';

const TYPE_LABELS: Record<CategoryAttributeType, string> = {
  TEXT: 'Texto',
  NUMBER: 'Número',
  BOOLEAN: 'Sí/No',
  SELECT: 'Selección única',
  MULTI_SELECT: 'Selección múltiple',
  RANGE: 'Rango numérico',
};

const NEEDS_OPTIONS: CategoryAttributeType[] = [CategoryAttributeType.SELECT, CategoryAttributeType.MULTI_SELECT];
// Fase 12 (cierre operativo): Texto y Número nunca son filtrables — el
// catálogo público no tiene un control de filtro sensato para "texto
// libre" ni "número exacto arbitrario"; un atributo numérico que sí debe
// filtrarse usa Rango numérico en su lugar. Ver category-attribute-schemas.ts.
const NEVER_FILTERABLE: CategoryAttributeType[] = [CategoryAttributeType.TEXT, CategoryAttributeType.NUMBER];

const EMPTY_NEW_ATTRIBUTE = {
  key: '',
  label: '',
  type: CategoryAttributeType.TEXT as CategoryAttributeType,
  required: false,
  filterable: true,
  visibleInCard: false,
  visibleInDetail: true,
  sortOrder: '0',
  optionsText: '',
  active: true,
};

/** Sección "atributos filtrables" de /admin/categories/[id]/edit — solo existe una vez que la categoría ya está persistida. */
export function CategoryAttributesManager({ categoryId, attributes }: { categoryId: string; attributes: CategoryAttributeView[] }) {
  const [list, setList] = useState(attributes);
  const [draft, setDraft] = useState(EMPTY_NEW_ATTRIBUTE);
  const [isPending, startTransition] = useTransition();
  const { toast, showSuccess, showError, dismiss } = useStatusToast();
  const router = useRouter();

  function handleAdd() {
    if (isPending) return;
    if (!draft.key.trim() || !draft.label.trim()) {
      showError('Completa la clave y la etiqueta del atributo.');
      return;
    }
    startTransition(async () => {
      const result = await createCategoryAttributeAction({
        categoryId,
        key: draft.key.trim(),
        label: draft.label.trim(),
        type: draft.type,
        required: draft.required,
        filterable: NEVER_FILTERABLE.includes(draft.type) ? false : draft.filterable,
        visibleInCard: draft.visibleInCard,
        visibleInDetail: draft.visibleInDetail,
        sortOrder: draft.sortOrder,
        options: NEEDS_OPTIONS.includes(draft.type)
          ? draft.optionsText
              .split('\n')
              .map((line) => line.trim())
              .filter(Boolean)
          : null,
        active: draft.active,
      });
      if (result.status === 'error') {
        showError(result.message);
        return;
      }
      setList((current) => [...current, result.attribute]);
      setDraft(EMPTY_NEW_ATTRIBUTE);
      showSuccess('Atributo agregado correctamente.');
      router.refresh();
    });
  }

  async function handleDelete(attributeId: string) {
    const result = await deleteCategoryAttributeAction(attributeId);
    if (result.status === 'error') {
      showError(result.message);
      return;
    }
    setList((current) => current.filter((a) => a.id !== attributeId));
    showSuccess('Atributo eliminado correctamente.');
    router.refresh();
  }

  return (
    <div>
      <label className="text-[13px] font-semibold text-navy">Atributos filtrables</label>
      <p className="mt-1 text-xs text-grafito">
        Extienden los filtros del catálogo público sin necesitar una migración — ver spec dynamic-catalog-filters.
      </p>

      {list.length > 0 ? (
        <div className="mt-2.5 overflow-hidden rounded-input border border-line">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray text-left text-[11px] font-bold uppercase tracking-wide text-[#5b6b85]">
                <th className="px-3 py-2">Clave</th>
                <th className="px-3 py-2">Etiqueta</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Filtrable</th>
                <th className="px-3 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {list.map((attribute) => (
                <tr key={attribute.id} className="border-t border-line">
                  <td className="px-3 py-2 font-mono text-xs">{attribute.key}</td>
                  <td className="px-3 py-2">{attribute.label}</td>
                  <td className="px-3 py-2">{TYPE_LABELS[attribute.type as CategoryAttributeType] ?? attribute.type}</td>
                  <td className="px-3 py-2">{attribute.filterable ? 'Sí' : 'No'}</td>
                  <td className="px-3 py-2 text-right">
                    <ConfirmDeleteButton action={() => handleDelete(attribute.id)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-2.5 rounded-input bg-gray px-3.5 py-3 text-xs text-grafito">
          Esta categoría todavía no tiene atributos filtrables definidos.
        </div>
      )}

      <div className="mt-3.5 rounded-input border border-line p-3.5">
        <p className="text-xs font-semibold text-navy">Agregar atributo</p>
        <div className="mt-2 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <input
            value={draft.key}
            onChange={(e) => setDraft((d) => ({ ...d, key: e.target.value }))}
            placeholder="clave-de-maquina"
            aria-label="Clave del atributo"
            className="rounded-input border border-line bg-white px-3 py-2 text-sm outline-none"
          />
          <input
            value={draft.label}
            onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
            placeholder="Etiqueta visible"
            aria-label="Etiqueta del atributo"
            className="rounded-input border border-line bg-white px-3 py-2 text-sm outline-none"
          />
          <select
            value={draft.type}
            onChange={(e) => {
              const nextType = e.target.value as CategoryAttributeType;
              setDraft((d) => ({ ...d, type: nextType, filterable: NEVER_FILTERABLE.includes(nextType) ? false : d.filterable }));
            }}
            aria-label="Tipo del atributo"
            className="rounded-input border border-line bg-white px-3 py-2 text-sm text-ink"
          >
            {Object.values(CategoryAttributeType).map((type) => (
              <option key={type} value={type}>
                {TYPE_LABELS[type]}
              </option>
            ))}
          </select>
          <input
            value={draft.sortOrder}
            onChange={(e) => setDraft((d) => ({ ...d, sortOrder: e.target.value }))}
            inputMode="numeric"
            aria-label="Orden"
            className="rounded-input border border-line bg-white px-3 py-2 text-sm outline-none"
          />
        </div>

        {NEEDS_OPTIONS.includes(draft.type) ? (
          <textarea
            value={draft.optionsText}
            onChange={(e) => setDraft((d) => ({ ...d, optionsText: e.target.value }))}
            placeholder={'Una opción por línea'}
            rows={3}
            aria-label="Opciones (una por línea)"
            className="mt-2.5 w-full resize-y rounded-input border border-line bg-white px-3 py-2 text-sm outline-none"
          />
        ) : null}

        <div className="mt-2.5 flex flex-wrap gap-3.5 text-xs text-ink">
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={draft.required} onChange={(e) => setDraft((d) => ({ ...d, required: e.target.checked }))} />
            Obligatorio
          </label>
          <label className="flex items-center gap-1.5" title={NEVER_FILTERABLE.includes(draft.type) ? 'Texto y Número no pueden ser filtrables — usa Rango numérico.' : undefined}>
            <input
              type="checkbox"
              checked={NEVER_FILTERABLE.includes(draft.type) ? false : draft.filterable}
              disabled={NEVER_FILTERABLE.includes(draft.type)}
              onChange={(e) => setDraft((d) => ({ ...d, filterable: e.target.checked }))}
            />
            Filtrable
          </label>
        </div>
        {NEVER_FILTERABLE.includes(draft.type) ? (
          <p className="mt-1.5 text-[11px] text-grafito">
            Texto y Número no pueden ser filtrables — usa Rango numérico si necesitas filtrar por un valor numérico.
          </p>
        ) : null}
        <div className="mt-2.5 flex flex-wrap gap-3.5 text-xs text-ink">
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={draft.visibleInCard}
              onChange={(e) => setDraft((d) => ({ ...d, visibleInCard: e.target.checked }))}
            />
            Visible en tarjeta
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={draft.visibleInDetail}
              onChange={(e) => setDraft((d) => ({ ...d, visibleInDetail: e.target.checked }))}
            />
            Visible en ficha
          </label>
        </div>

        <button
          type="button"
          disabled={isPending}
          onClick={handleAdd}
          className="mt-3 rounded-input bg-navy px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
        >
          {isPending ? 'Agregando…' : 'Agregar atributo'}
        </button>
      </div>

      <StatusToast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
