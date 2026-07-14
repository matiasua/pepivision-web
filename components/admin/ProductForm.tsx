'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Gender, ProductBadge, ProductMaterial, ProductShape } from '@prisma/client';
import { GENDER_LABELS, MATERIAL_LABELS, SHAPE_LABELS, BADGE_LABELS } from '@/modules/catalog/labels';
import {
  addProductColorAction,
  reassignAndRemoveProductColorAction,
  removeProductColorAction,
  type ProductColorView,
  type ProductImageView,
} from '@/app/admin/products/actions';
import { BrandSelect, type BrandOption } from './BrandSelect';
import { ProductGalleryManager } from './ProductGalleryManager';
import { StatusToast, useStatusToast } from './StatusToast';

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

export type ProductColorValue = ProductColorView | { id?: undefined; name: string; hex: string };

export interface ProductFormValues {
  name: string;
  code: string;
  brandId: string;
  priceFromClp: string;
  sizes: string;
  gender: Gender;
  shape: ProductShape;
  material: ProductMaterial;
  available: boolean;
  visible: boolean;
  badge: ProductBadge | '';
  description: string;
  colors: ProductColorValue[];
}

const EMPTY_VALUES: Omit<ProductFormValues, 'colors'> = {
  name: '',
  code: '',
  brandId: '',
  priceFromClp: '',
  sizes: '',
  gender: Gender.UNISEX,
  shape: ProductShape.REDONDO,
  material: ProductMaterial.ACETATO,
  available: true,
  visible: true,
  badge: '',
  description: '',
};

type SaveActionResult = { status: 'error'; message: string } | { status: 'success'; productId: string };

export function ProductForm({
  initialValues,
  title,
  onSubmit,
  productId,
  images,
  brands,
}: {
  initialValues?: ProductFormValues;
  title: string;
  onSubmit: (values: ProductFormValues) => Promise<SaveActionResult>;
  productId?: string;
  images?: ProductImageView[];
  brands: BrandOption[];
}) {
  const [values, setValues] = useState<Omit<ProductFormValues, 'colors'>>(initialValues ?? EMPTY_VALUES);
  // Single source of truth for both the color picker below and
  // ProductGalleryManager's color list — no second, independently-updated
  // copy anywhere. In edit mode every entry here always has a real,
  // already-persisted `id` (add/remove call the server immediately, see
  // handleAddColor/handleRemoveColor); in create mode entries are
  // client-only until the product itself is created.
  const [colors, setColors] = useState<ProductColorValue[]>(initialValues?.colors ?? []);
  // Similarly lifted so a color reassignment (see handleReassignAndRemove)
  // can update which color a photo belongs to without waiting for a full
  // page reload — ProductGalleryManager no longer owns this state itself.
  const [images_, setImages] = useState<ProductImageView[]>(images ?? []);
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#888888');
  const [colorBusyName, setColorBusyName] = useState<string | null>(null);
  const [blockedRemoval, setBlockedRemoval] = useState<{ colorId: string; name: string; photoCount: number } | null>(null);
  const [reassignTargetId, setReassignTargetId] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const [, startColorTransition] = useTransition();
  // Set on successful submit, read by the effect below to trigger
  // navigation *outside* the transition — see handleSubmit for why.
  const [savedProductId, setSavedProductId] = useState<string | null>(null);
  const { toast, showSuccess, showError, dismiss } = useStatusToast();
  const router = useRouter();
  const hasNavigatedRef = useRef(false);

  // router.push()/router.refresh() themselves stay "pending" (in the
  // React sense) until the destination route's data has loaded — if
  // called inside the same startTransition as the submit, isPending (and
  // therefore the "Guardando…" label) doesn't clear until that navigation
  // finishes, not when the save itself finishes. Running them here, in a
  // separate effect outside the transition, lets the button revert to
  // "Guardar modelo" the moment the save resolves, independent of how long
  // the subsequent navigation takes. The ref guards against firing twice —
  // this effect's own dependency identity (`router`) isn't guaranteed
  // stable across re-renders, and navigating twice would be a real bug in
  // its own right, not just a test artifact.
  useEffect(() => {
    if (!savedProductId || hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;
    // Creating a product for the first time must land on *its* edit page —
    // that's the only place a color/photo can be added, since both need a
    // real, persisted productId to attach to.
    router.push(productId ? '/admin/products' : `/admin/products/${savedProductId}/edit`);
    router.refresh();
  }, [savedProductId, productId, router]);

  function set<K extends keyof Omit<ProductFormValues, 'colors'>>(key: K, value: Omit<ProductFormValues, 'colors'>[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function handleAddColor(name: string, hex: string) {
    if (colors.some((c) => c.name === name)) return;

    if (!productId) {
      setColors((current) => [...current, { name, hex }]);
      return;
    }

    setColorBusyName(name);
    startColorTransition(async () => {
      const result = await addProductColorAction(productId, { name, hex });
      setColorBusyName(null);
      if (result.status === 'error') {
        showError(result.message);
        return;
      }
      setColors((current) => [...current, result.color]);
      showSuccess('Color agregado correctamente.');
      router.refresh();
    });
  }

  function handleRemoveColor(color: ProductColorValue) {
    if (!productId || !color.id) {
      setColors((current) => current.filter((c) => c.name !== color.name));
      return;
    }

    const colorId = color.id;
    setColorBusyName(color.name);
    startColorTransition(async () => {
      const result = await removeProductColorAction(productId, colorId);
      setColorBusyName(null);
      if (result.status === 'error') {
        showError(result.message);
        return;
      }
      if (result.status === 'blocked') {
        setBlockedRemoval({ colorId, name: color.name, photoCount: result.photoCount });
        return;
      }
      setColors((current) => current.filter((c) => c.id !== colorId));
      showSuccess('Color eliminado correctamente.');
      router.refresh();
    });
  }

  function handleReassignAndRemove() {
    if (!productId || !blockedRemoval || !reassignTargetId) return;
    const { colorId } = blockedRemoval;
    setColorBusyName(blockedRemoval.name);
    startColorTransition(async () => {
      const result = await reassignAndRemoveProductColorAction(productId, colorId, reassignTargetId);
      setColorBusyName(null);
      if (result.status === 'error') {
        showError(result.message);
        return;
      }
      setColors((current) => current.filter((c) => c.id !== colorId));
      setImages((current) => current.map((img) => (img.productColorId === colorId ? { ...img, productColorId: reassignTargetId } : img)));
      showSuccess('Las fotografías fueron reasignadas correctamente.');
      setBlockedRemoval(null);
      setReassignTargetId('');
      router.refresh();
    });
  }

  function handleSubmit() {
    if (isPending) return; // ignore a second click while a submit is already in flight
    setError('');
    startTransition(async () => {
      const result = await onSubmit({ ...values, colors });
      if (result.status === 'error') {
        setError(result.message);
        showError(result.message);
        return;
      }
      showSuccess('Los cambios se guardaron correctamente.');
      setSavedProductId(result.productId);
    });
  }

  const customColors = colors.filter((c) => !(c.name in PREDEFINED_COLORS));

  return (
    <div className="rounded-card border border-line bg-white p-7 shadow-brand">
      <h2 className="mb-5 text-xl font-bold">{title}</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="product-name" className="text-[13px] font-semibold text-navy">Nombre *</label>
          <input
            id="product-name"
            value={values.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Ej: Aurora"
            className="mt-1.5 w-full rounded-input border border-line bg-white px-3.5 py-3 outline-none"
          />
        </div>
        <div>
          <label htmlFor="product-code" className="text-[13px] font-semibold text-navy">Código *</label>
          <input
            id="product-code"
            value={values.code}
            onChange={(e) => set('code', e.target.value)}
            placeholder="Ej: PV-111"
            className="mt-1.5 w-full rounded-input border border-line bg-white px-3.5 py-3 outline-none"
          />
        </div>
        <div>
          <label id="product-brand-label" className="text-[13px] font-semibold text-navy">Marca *</label>
          <div className="mt-1.5">
            <BrandSelect
              brands={brands}
              value={values.brandId}
              onChange={(brandId) => set('brandId', brandId)}
              labelledBy="product-brand-label"
            />
          </div>
        </div>
        <div>
          <label htmlFor="product-price" className="text-[13px] font-semibold text-navy">Precio desde (CLP) *</label>
          <input
            id="product-price"
            value={values.priceFromClp}
            onChange={(e) => set('priceFromClp', e.target.value)}
            placeholder="39900"
            inputMode="numeric"
            className="mt-1.5 w-full rounded-input border border-line bg-white px-3.5 py-3 outline-none"
          />
        </div>
        <div>
          <label htmlFor="product-sizes" className="text-[13px] font-semibold text-navy">Medidas</label>
          <input
            id="product-sizes"
            value={values.sizes}
            onChange={(e) => set('sizes', e.target.value)}
            placeholder="52-18-140 mm"
            className="mt-1.5 w-full rounded-input border border-line bg-white px-3.5 py-3 outline-none"
          />
        </div>
        <div>
          <label htmlFor="product-gender" className="text-[13px] font-semibold text-navy">Público</label>
          <select
            id="product-gender"
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
          <label htmlFor="product-shape" className="text-[13px] font-semibold text-navy">Forma</label>
          <select
            id="product-shape"
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
          <label htmlFor="product-material" className="text-[13px] font-semibold text-navy">Material</label>
          <select
            id="product-material"
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
          <label htmlFor="product-available" className="text-[13px] font-semibold text-navy">Disponibilidad</label>
          <select
            id="product-available"
            value={values.available ? 'true' : 'false'}
            onChange={(e) => set('available', e.target.value === 'true')}
            className="mt-1.5 w-full rounded-input border border-line bg-white px-3.5 py-3 text-ink"
          >
            <option value="true">Disponible</option>
            <option value="false">Bajo pedido</option>
          </select>
        </div>
        <div>
          <label htmlFor="product-badge" className="text-[13px] font-semibold text-navy">Etiqueta</label>
          <select
            id="product-badge"
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
          <label htmlFor="product-visible" className="text-[13px] font-semibold text-navy">Visibilidad en catálogo</label>
          <select
            id="product-visible"
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
            const active = colors.some((c) => c.name === name);
            const busy = colorBusyName === name;
            return (
              <button
                key={name}
                type="button"
                disabled={busy}
                aria-pressed={active}
                onClick={() => (active ? handleRemoveColor(colors.find((c) => c.name === name)!) : handleAddColor(name, hex))}
                className={`inline-flex items-center gap-1.5 rounded-pill border-[1.5px] px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
                  active ? 'border-fucsia bg-brand-gradient-soft text-fucsia' : 'border-line text-grafito'
                }`}
              >
                <span className="h-3.5 w-3.5 rounded-full border border-white shadow-[0_0_0_1px_#d7dceb]" style={{ backgroundColor: hex }} />
                {name}
                {busy ? '…' : ''}
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
              {colorBusyName === c.name ? '…' : null}
              <button
                type="button"
                disabled={colorBusyName === c.name}
                onClick={() => handleRemoveColor(c)}
                aria-label={`Quitar ${c.name}`}
                className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-fucsia text-[10px] text-white disabled:opacity-50"
              >
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
          <button
            type="button"
            onClick={() => {
              const name = newColorName.trim();
              if (!name) return;
              handleAddColor(name, newColorHex);
              setNewColorName('');
              setNewColorHex('#888888');
            }}
            className="rounded-input bg-navy px-4.5 py-2.5 text-[13.5px] font-semibold text-white"
          >
            Agregar color
          </button>
        </div>

        {blockedRemoval ? (
          <div className="mt-3 rounded-2xl border border-[#f3c6d3] bg-error-bg p-3.5">
            <p className="text-[13px] font-semibold text-error">
              El color &quot;{blockedRemoval.name}&quot; no puede eliminarse porque tiene {blockedRemoval.photoCount}{' '}
              {blockedRemoval.photoCount === 1 ? 'fotografía asociada' : 'fotografías asociadas'}.
            </p>
            <p className="mt-1 text-xs text-grafito">
              Reasigna esas fotografías a otro color para poder eliminar &quot;{blockedRemoval.name}&quot;, o cancela.
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <select
                value={reassignTargetId}
                onChange={(e) => setReassignTargetId(e.target.value)}
                className="rounded-input border border-line bg-white px-3 py-2 text-sm text-ink"
              >
                <option value="">Reasignar a…</option>
                {colors
                  .filter((c) => c.id && c.id !== blockedRemoval.colorId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                disabled={!reassignTargetId || colorBusyName === blockedRemoval.name}
                onClick={handleReassignAndRemove}
                className="rounded-input bg-navy px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                Reasignar y eliminar
              </button>
              <button
                type="button"
                onClick={() => {
                  setBlockedRemoval(null);
                  setReassignTargetId('');
                }}
                className="rounded-input bg-gray px-4 py-2 text-xs font-semibold text-grafito"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : null}

        {!productId && colors.length > 0 ? (
          <div className="mt-2 text-xs text-[#5b6b85]">
            Podrás subir fotografías para estos colores después de guardar este modelo por primera vez.
          </div>
        ) : null}
      </div>

      <div className="mt-5">
        <label htmlFor="product-description" className="text-[13px] font-semibold text-navy">Descripción</label>
        <textarea
          id="product-description"
          value={values.description}
          onChange={(e) => set('description', e.target.value)}
          rows={3}
          placeholder="Describe el modelo…"
          className="mt-1.5 w-full resize-y rounded-input border border-line bg-white px-3.5 py-3 outline-none"
        />
      </div>

      <div className="mt-5">
        {productId ? (
          <ProductGalleryManager
            productId={productId}
            productName={values.name}
            images={images_}
            onImagesChange={setImages}
            colors={colors.filter((c): c is ProductColorView => Boolean(c.id))}
          />
        ) : (
          <>
            <label className="text-[13px] font-semibold text-navy">Fotografías del producto</label>
            <div className="mt-2.5 rounded-input bg-gray px-3.5 py-3 text-xs text-grafito">
              Podrás subir fotografías después de guardar este modelo por primera vez.
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

      <StatusToast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
