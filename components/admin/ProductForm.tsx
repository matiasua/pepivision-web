'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Gender, ProductBadge, ProductMaterial, ProductShape } from '@prisma/client';
import { GENDER_LABELS, MATERIAL_LABELS, SHAPE_LABELS, BADGE_LABELS } from '@/modules/catalog/labels';

const PREDEFINED_COLORS: Record<string, string> = {
  Fucsia: '#E5127D',
  Negro: '#1c1c22',
  Carey: '#7a4a1e',
  Azul: '#16265F',
  Dorado: '#d4af37',
  Plata: '#b8c0cc',
  Rosado: '#F48FB1',
  Cristal: '#dfe6ee',
  Verde: '#2f7d5b',
  Café: '#5a3a24',
};

export interface ProductFormValues {
  name: string;
  code: string;
  priceFromClp: string;
  sizes: string;
  gender: Gender;
  shape: ProductShape;
  material: ProductMaterial;
  available: boolean;
  visible: boolean;
  badge: ProductBadge | '';
  description: string;
  colors: { name: string; hex: string }[];
}

const EMPTY_VALUES: ProductFormValues = {
  name: '',
  code: '',
  priceFromClp: '',
  sizes: '',
  gender: Gender.UNISEX,
  shape: ProductShape.REDONDO,
  material: ProductMaterial.ACETATO,
  available: true,
  visible: true,
  badge: '',
  description: '',
  colors: [],
};

type ActionResult = { status: 'error'; message: string } | { status: 'success' };

export function ProductForm({
  initialValues,
  title,
  onSubmit,
}: {
  initialValues?: ProductFormValues;
  title: string;
  onSubmit: (values: ProductFormValues) => Promise<ActionResult>;
}) {
  const [values, setValues] = useState<ProductFormValues>(initialValues ?? EMPTY_VALUES);
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#888888');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function set<K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function toggleColor(name: string, hex: string) {
    const exists = values.colors.some((c) => c.name === name);
    set('colors', exists ? values.colors.filter((c) => c.name !== name) : [...values.colors, { name, hex }]);
  }

  function addCustomColor() {
    const name = newColorName.trim();
    if (!name || values.colors.some((c) => c.name === name)) return;
    set('colors', [...values.colors, { name, hex: newColorHex }]);
    setNewColorName('');
    setNewColorHex('#888888');
  }

  function removeColor(name: string) {
    set('colors', values.colors.filter((c) => c.name !== name));
  }

  function handleSubmit() {
    setError('');
    startTransition(async () => {
      const result = await onSubmit(values);
      if (result.status === 'error') {
        setError(result.message);
        return;
      }
      router.push('/admin/products');
      router.refresh();
    });
  }

  const customColors = values.colors.filter((c) => !(c.name in PREDEFINED_COLORS));

  return (
    <div className="rounded-card border border-line bg-white p-7 shadow-brand">
      <h2 className="mb-5 text-xl font-bold">{title}</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="text-[13px] font-semibold text-navy">Nombre *</label>
          <input
            value={values.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Ej: Aurora"
            className="mt-1.5 w-full rounded-input border border-line bg-white px-3.5 py-3 outline-none"
          />
        </div>
        <div>
          <label className="text-[13px] font-semibold text-navy">Código *</label>
          <input
            value={values.code}
            onChange={(e) => set('code', e.target.value)}
            placeholder="Ej: PV-111"
            className="mt-1.5 w-full rounded-input border border-line bg-white px-3.5 py-3 outline-none"
          />
        </div>
        <div>
          <label className="text-[13px] font-semibold text-navy">Precio desde (CLP) *</label>
          <input
            value={values.priceFromClp}
            onChange={(e) => set('priceFromClp', e.target.value)}
            placeholder="39900"
            inputMode="numeric"
            className="mt-1.5 w-full rounded-input border border-line bg-white px-3.5 py-3 outline-none"
          />
        </div>
        <div>
          <label className="text-[13px] font-semibold text-navy">Medidas</label>
          <input
            value={values.sizes}
            onChange={(e) => set('sizes', e.target.value)}
            placeholder="52-18-140 mm"
            className="mt-1.5 w-full rounded-input border border-line bg-white px-3.5 py-3 outline-none"
          />
        </div>
        <div>
          <label className="text-[13px] font-semibold text-navy">Público</label>
          <select
            value={values.gender}
            onChange={(e) => set('gender', e.target.value as Gender)}
            className="mt-1.5 w-full rounded-input border border-line bg-white px-3.5 py-3 text-ink"
          >
            {Object.values(Gender).map((g) => (
              <option key={g} value={g}>
                {GENDER_LABELS[g]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[13px] font-semibold text-navy">Forma</label>
          <select
            value={values.shape}
            onChange={(e) => set('shape', e.target.value as ProductShape)}
            className="mt-1.5 w-full rounded-input border border-line bg-white px-3.5 py-3 text-ink"
          >
            {Object.values(ProductShape).map((s) => (
              <option key={s} value={s}>
                {SHAPE_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[13px] font-semibold text-navy">Material</label>
          <select
            value={values.material}
            onChange={(e) => set('material', e.target.value as ProductMaterial)}
            className="mt-1.5 w-full rounded-input border border-line bg-white px-3.5 py-3 text-ink"
          >
            {Object.values(ProductMaterial).map((m) => (
              <option key={m} value={m}>
                {MATERIAL_LABELS[m]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[13px] font-semibold text-navy">Disponibilidad</label>
          <select
            value={values.available ? 'true' : 'false'}
            onChange={(e) => set('available', e.target.value === 'true')}
            className="mt-1.5 w-full rounded-input border border-line bg-white px-3.5 py-3 text-ink"
          >
            <option value="true">Disponible</option>
            <option value="false">Bajo pedido</option>
          </select>
        </div>
        <div>
          <label className="text-[13px] font-semibold text-navy">Etiqueta</label>
          <select
            value={values.badge}
            onChange={(e) => set('badge', e.target.value as ProductBadge | '')}
            className="mt-1.5 w-full rounded-input border border-line bg-white px-3.5 py-3 text-ink"
          >
            <option value="">Sin etiqueta</option>
            {Object.values(ProductBadge).map((b) => (
              <option key={b} value={b}>
                {BADGE_LABELS[b]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[13px] font-semibold text-navy">Visibilidad en catálogo</label>
          <select
            value={values.visible ? 'true' : 'false'}
            onChange={(e) => set('visible', e.target.value === 'true')}
            className="mt-1.5 w-full rounded-input border border-line bg-white px-3.5 py-3 text-ink"
          >
            <option value="true">Publicado</option>
            <option value="false">Despublicado</option>
          </select>
        </div>
      </div>

      <div className="mt-5">
        <label className="text-[13px] font-semibold text-navy">Colores disponibles</label>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {Object.entries(PREDEFINED_COLORS).map(([name, hex]) => {
            const active = values.colors.some((c) => c.name === name);
            return (
              <button
                key={name}
                type="button"
                onClick={() => toggleColor(name, hex)}
                className={`inline-flex items-center gap-1.5 rounded-pill border-[1.5px] px-3 py-1.5 text-xs font-semibold ${
                  active ? 'border-fucsia bg-brand-gradient-soft text-fucsia' : 'border-line text-grafito'
                }`}
              >
                <span className="h-3.5 w-3.5 rounded-full border border-white shadow-[0_0_0_1px_#d7dceb]" style={{ backgroundColor: hex }} />
                {name}
              </button>
            );
          })}
          {customColors.map((c) => (
            <span
              key={c.name}
              className="inline-flex items-center gap-1.5 rounded-pill border-[1.5px] border-fucsia bg-brand-gradient-soft px-3 py-1.5 text-xs font-semibold text-fucsia"
            >
              <span className="h-3.5 w-3.5 rounded-full border border-white shadow-[0_0_0_1px_#d7dceb]" style={{ backgroundColor: c.hex }} />
              {c.name}
              <button type="button" onClick={() => removeColor(c.name)} aria-label={`Quitar ${c.name}`} className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-fucsia text-[10px] text-white">
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
          <input
            type="color"
            value={newColorHex}
            onChange={(e) => setNewColorHex(e.target.value)}
            aria-label="Elegir tono del color"
            className="h-[42px] w-[46px] rounded-input border border-line p-0.5"
          />
          <input
            value={newColorName}
            onChange={(e) => setNewColorName(e.target.value)}
            placeholder="Nombre del color (ej: Verde militar)"
            className="min-w-[190px] flex-1 rounded-input border border-line bg-white px-3.5 py-2.5 outline-none"
          />
          <button type="button" onClick={addCustomColor} className="rounded-input bg-navy px-4.5 py-2.5 text-[13.5px] font-semibold text-white">
            Agregar color
          </button>
        </div>
      </div>

      <div className="mt-5">
        <label className="text-[13px] font-semibold text-navy">Descripción</label>
        <textarea
          value={values.description}
          onChange={(e) => set('description', e.target.value)}
          rows={3}
          placeholder="Describe el modelo…"
          className="mt-1.5 w-full resize-y rounded-input border border-line bg-white px-3.5 py-3 outline-none"
        />
      </div>

      {error ? (
        <div className="mt-4 rounded-input bg-error-bg px-3.5 py-3 text-[13px] font-semibold text-error">{error}</div>
      ) : null}

      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={() => router.push('/admin/products')} className="rounded-input bg-gray px-6 py-3 font-semibold text-navy">
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="rounded-input bg-brand-gradient px-7 py-3 font-semibold text-white shadow-brand-sm disabled:opacity-60"
        >
          {isPending ? 'Guardando…' : 'Guardar modelo'}
        </button>
      </div>
    </div>
  );
}
