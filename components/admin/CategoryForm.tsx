'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CategoryAttributesManager } from './CategoryAttributesManager';
import type { CategoryAttributeView } from '@/app/admin/categories/actions';
import { StatusToast, useStatusToast } from './StatusToast';

export interface CategoryCapabilitiesValues {
  requiresColor: boolean;
  allowsLensType: boolean;
  allowsTreatments: boolean;
  allowsPrescription: boolean;
  allowsPrescriptionAttachment: boolean;
  allowsLensTint: boolean;
  allowsFrameSelection: boolean;
}

export interface CategoryFormValues {
  name: string;
  shortDescription: string;
  description: string;
  active: boolean;
  visible: boolean;
  sortOrder: string;
  icon: string;
  imagePath: string;
  seoTitle: string;
  seoDescription: string;
  capabilities: CategoryCapabilitiesValues;
}

export const EMPTY_CATEGORY_CAPABILITIES: CategoryCapabilitiesValues = {
  requiresColor: true,
  allowsLensType: false,
  allowsTreatments: false,
  allowsPrescription: false,
  allowsPrescriptionAttachment: false,
  allowsLensTint: false,
  allowsFrameSelection: true,
};

const EMPTY_VALUES: CategoryFormValues = {
  name: '',
  shortDescription: '',
  description: '',
  active: true,
  visible: true,
  sortOrder: '0',
  icon: '',
  imagePath: '',
  seoTitle: '',
  seoDescription: '',
  capabilities: EMPTY_CATEGORY_CAPABILITIES,
};

const CAPABILITY_LABELS: { key: keyof CategoryCapabilitiesValues; label: string }[] = [
  { key: 'requiresColor', label: 'Requiere elegir un color' },
  { key: 'allowsFrameSelection', label: 'Selección de un armazón concreto' },
  { key: 'allowsLensType', label: 'Habilita tipo de cristal' },
  { key: 'allowsTreatments', label: 'Habilita tratamientos' },
  { key: 'allowsPrescription', label: 'Pregunta si tiene receta óptica' },
  { key: 'allowsPrescriptionAttachment', label: 'Permite adjuntar la receta (requiere la anterior)' },
  { key: 'allowsLensTint', label: 'Habilita tinte de cristal' },
];

type SaveActionResult = { status: 'error'; message: string } | { status: 'success'; categoryId: string };

export function CategoryForm({
  initialValues,
  title,
  onSubmit,
  categoryId,
  attributes,
}: {
  initialValues?: CategoryFormValues;
  title: string;
  onSubmit: (values: CategoryFormValues) => Promise<SaveActionResult>;
  categoryId?: string;
  attributes?: CategoryAttributeView[];
}) {
  const [values, setValues] = useState<CategoryFormValues>(initialValues ?? EMPTY_VALUES);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const [savedCategoryId, setSavedCategoryId] = useState<string | null>(null);
  const { toast, showSuccess, showError, dismiss } = useStatusToast();
  const router = useRouter();
  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    if (!savedCategoryId || hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;
    router.push(categoryId ? '/admin/categories' : `/admin/categories/${savedCategoryId}/edit`);
    router.refresh();
  }, [savedCategoryId, categoryId, router]);

  function set<K extends keyof CategoryFormValues>(key: K, value: CategoryFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function setCapability(key: keyof CategoryCapabilitiesValues, value: boolean) {
    setValues((current) => ({ ...current, capabilities: { ...current.capabilities, [key]: value } }));
  }

  function handleSubmit() {
    if (isPending) return;
    setError('');
    startTransition(async () => {
      const result = await onSubmit(values);
      if (result.status === 'error') {
        setError(result.message);
        showError(result.message);
        return;
      }
      showSuccess('Los cambios se guardaron correctamente.');
      setSavedCategoryId(result.categoryId);
    });
  }

  return (
    <div className="rounded-card border border-line bg-white p-7 shadow-brand">
      <h2 className="mb-5 text-xl font-bold">{title}</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="category-name" className="text-[13px] font-semibold text-navy">Nombre *</label>
          <input
            id="category-name"
            value={values.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Ej: Lentes de sol sin receta"
            className="mt-1.5 w-full rounded-input border border-line bg-white px-3.5 py-3 outline-none"
          />
        </div>
        <div>
          <label htmlFor="category-sort-order" className="text-[13px] font-semibold text-navy">Orden</label>
          <input
            id="category-sort-order"
            value={values.sortOrder}
            onChange={(e) => set('sortOrder', e.target.value)}
            inputMode="numeric"
            className="mt-1.5 w-full rounded-input border border-line bg-white px-3.5 py-3 outline-none"
          />
        </div>
        <div>
          <label htmlFor="category-icon" className="text-[13px] font-semibold text-navy">Ícono</label>
          <input
            id="category-icon"
            value={values.icon}
            onChange={(e) => set('icon', e.target.value)}
            className="mt-1.5 w-full rounded-input border border-line bg-white px-3.5 py-3 outline-none"
          />
        </div>
        <div>
          <label htmlFor="category-image-path" className="text-[13px] font-semibold text-navy">Imagen (ruta)</label>
          <input
            id="category-image-path"
            value={values.imagePath}
            onChange={(e) => set('imagePath', e.target.value)}
            className="mt-1.5 w-full rounded-input border border-line bg-white px-3.5 py-3 outline-none"
          />
        </div>
        <div>
          <label htmlFor="category-active" className="text-[13px] font-semibold text-navy">Activa</label>
          <select
            id="category-active"
            value={values.active ? 'true' : 'false'}
            onChange={(e) => set('active', e.target.value === 'true')}
            className="mt-1.5 w-full rounded-input border border-line bg-white px-3.5 py-3 text-ink"
          >
            <option value="true">Activa</option>
            <option value="false">Inactiva</option>
          </select>
        </div>
        <div>
          <label htmlFor="category-visible" className="text-[13px] font-semibold text-navy">Visible en catálogo</label>
          <select
            id="category-visible"
            value={values.visible ? 'true' : 'false'}
            onChange={(e) => set('visible', e.target.value === 'true')}
            className="mt-1.5 w-full rounded-input border border-line bg-white px-3.5 py-3 text-ink"
          >
            <option value="true">Visible</option>
            <option value="false">Oculta</option>
          </select>
        </div>
      </div>

      <div className="mt-5">
        <label htmlFor="category-short-description" className="text-[13px] font-semibold text-navy">Descripción corta</label>
        <input
          id="category-short-description"
          value={values.shortDescription}
          onChange={(e) => set('shortDescription', e.target.value)}
          className="mt-1.5 w-full rounded-input border border-line bg-white px-3.5 py-3 outline-none"
        />
      </div>

      <div className="mt-5">
        <label htmlFor="category-description" className="text-[13px] font-semibold text-navy">Descripción</label>
        <textarea
          id="category-description"
          value={values.description}
          onChange={(e) => set('description', e.target.value)}
          rows={3}
          className="mt-1.5 w-full resize-y rounded-input border border-line bg-white px-3.5 py-3 outline-none"
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="category-seo-title" className="text-[13px] font-semibold text-navy">SEO — Título</label>
          <input
            id="category-seo-title"
            value={values.seoTitle}
            onChange={(e) => set('seoTitle', e.target.value)}
            className="mt-1.5 w-full rounded-input border border-line bg-white px-3.5 py-3 outline-none"
          />
        </div>
        <div>
          <label htmlFor="category-seo-description" className="text-[13px] font-semibold text-navy">SEO — Descripción</label>
          <input
            id="category-seo-description"
            value={values.seoDescription}
            onChange={(e) => set('seoDescription', e.target.value)}
            className="mt-1.5 w-full rounded-input border border-line bg-white px-3.5 py-3 outline-none"
          />
        </div>
      </div>

      <div className="mt-5">
        <span className="text-[13px] font-semibold text-navy">Capacidades</span>
        <p className="mt-1 text-xs text-grafito">
          Determinan qué pasos del cotizador y qué secciones del formulario de producto se activan para esta categoría.
        </p>
        <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {CAPABILITY_LABELS.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={values.capabilities[key]}
                onChange={(e) => setCapability(key, e.target.checked)}
                className="h-4 w-4 rounded border-line"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="mt-5">
        {categoryId ? (
          <CategoryAttributesManager categoryId={categoryId} attributes={attributes ?? []} />
        ) : (
          <>
            <label className="text-[13px] font-semibold text-navy">Atributos filtrables</label>
            <div className="mt-2.5 rounded-input bg-gray px-3.5 py-3 text-xs text-grafito">
              Podrás definir atributos filtrables después de guardar esta categoría por primera vez.
            </div>
          </>
        )}
      </div>

      <div aria-live="polite">
        {error ? (
          <div className="mt-4 rounded-input bg-error-bg px-3.5 py-3 text-[13px] font-semibold text-error">{error}</div>
        ) : null}
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={() => router.push('/admin/categories')} className="rounded-input bg-gray px-6 py-3 font-semibold text-navy">
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="rounded-input bg-brand-gradient px-7 py-3 font-semibold text-white shadow-brand-sm disabled:opacity-60"
        >
          {isPending ? 'Guardando…' : 'Guardar categoría'}
        </button>
      </div>

      <StatusToast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
