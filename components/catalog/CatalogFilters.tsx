'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Gender, ProductMaterial, ProductShape } from '@prisma/client';
import { GENDER_LABELS, MATERIAL_LABELS, SHAPE_LABELS } from '@/modules/catalog/labels';
import { buildFilterHref, buildToggleHref, buildMultiToggleHref } from '@/modules/catalog/filter-url';
import { DYNAMIC_FILTER_PREFIX, parseAttributeOptionsList, type FilterableAttributeDefinition } from '@/modules/catalog/dynamic-filters';
import { CloseIcon } from '@/components/icons';

const GENDER_OPTIONS = Object.values(Gender);
const SHAPE_OPTIONS = Object.values(ProductShape);
const MATERIAL_OPTIONS = Object.values(ProductMaterial);

const COLOR_SWATCHES: Record<string, string> = {
  Fucsia: '#E5127D',
  Negro: '#1c1c22',
  Carey: '#7a4a1e',
  Azul: '#16265F',
  Dorado: '#d4af37',
  Plata: '#b8c0cc',
  Rosado: '#F48FB1',
};

function chipClass(active: boolean) {
  return `rounded-pill border-[1.5px] px-3.5 py-2 text-[13px] font-semibold transition-colors ${
    active ? 'border-fucsia bg-brand-gradient-soft text-fucsia' : 'border-line bg-white text-grafito'
  }`;
}

/** Fase 12 (filtros dinámicos): un control por `CategoryAttributeDefinition` activa/filtrable — el tipo decide el control, nunca una segunda allowlist en el cliente (los valores válidos ya vienen acotados por `options`, cuando la definición los declara). */
function DynamicAttributeFilter({
  attribute,
  basePath,
  searchParams,
  router,
}: {
  attribute: FilterableAttributeDefinition;
  basePath: string;
  searchParams: URLSearchParams;
  router: ReturnType<typeof useRouter>;
}) {
  const paramKey = `${DYNAMIC_FILTER_PREFIX}${attribute.key}`;
  const options = parseAttributeOptionsList(attribute.options) ?? [];

  if (attribute.type === 'SELECT') {
    const active = searchParams.get(paramKey);
    return (
      <div className="mt-4.5">
        <div className="mb-2.5 text-[13px] font-semibold text-navy">{attribute.label}</div>
        <div className="flex flex-wrap gap-1.5">
          <Link href={buildFilterHref(basePath, searchParams, paramKey, null)} aria-current={!active} className={chipClass(!active)}>
            Todos
          </Link>
          {options.map((option) => (
            <Link
              key={option}
              href={buildToggleHref(basePath, searchParams, paramKey, option)}
              aria-current={active === option}
              className={chipClass(active === option)}
            >
              {option}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  if (attribute.type === 'MULTI_SELECT') {
    const active = searchParams.getAll(paramKey);
    return (
      <fieldset className="mt-4.5">
        <legend className="mb-2.5 text-[13px] font-semibold text-navy">{attribute.label}</legend>
        <div className="flex flex-col gap-2">
          {options.map((option) => {
            const checked = active.includes(option);
            return (
              <label key={option} className="flex cursor-pointer items-center gap-2.5 text-sm text-grafito">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => router.push(buildMultiToggleHref(basePath, searchParams, paramKey, option))}
                  aria-label={option}
                  className="h-[18px] w-[18px] accent-fucsia"
                />
                {option}
              </label>
            );
          })}
        </div>
      </fieldset>
    );
  }

  if (attribute.type === 'BOOLEAN') {
    const checked = searchParams.get(paramKey) === '1';
    return (
      <label className="mt-4.5 flex cursor-pointer items-center gap-2.5 text-sm text-grafito">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => router.push(buildFilterHref(basePath, searchParams, paramKey, event.target.checked ? '1' : null))}
          className="h-[18px] w-[18px] accent-fucsia"
        />
        {attribute.label}
      </label>
    );
  }

  if (attribute.type === 'RANGE') {
    return (
      <RangeAttributeFilter attribute={attribute} paramKey={paramKey} basePath={basePath} searchParams={searchParams} router={router} />
    );
  }

  return null;
}

/** Extraído como componente propio: un tipo RANGE necesita estado local (inputs controlados antes de "Aplicar"), y las Reglas de Hooks exigen que `useState` nunca dependa de una rama condicional dentro del mismo componente. */
function RangeAttributeFilter({
  attribute,
  paramKey,
  basePath,
  searchParams,
  router,
}: {
  attribute: FilterableAttributeDefinition;
  paramKey: string;
  basePath: string;
  searchParams: URLSearchParams;
  router: ReturnType<typeof useRouter>;
}) {
  const minKey = `${paramKey}_min`;
  const maxKey = `${paramKey}_max`;
  const [minValue, setMinValue] = useState(searchParams.get(minKey) ?? '');
  const [maxValue, setMaxValue] = useState(searchParams.get(maxKey) ?? '');
  const rangeError = minValue !== '' && maxValue !== '' && Number(minValue) > Number(maxValue);

  function applyRange() {
    if (rangeError) return;
    const next = new URLSearchParams(searchParams);
    if (minValue.trim()) next.set(minKey, minValue.trim());
    else next.delete(minKey);
    if (maxValue.trim()) next.set(maxKey, maxValue.trim());
    else next.delete(maxKey);
    const query = next.toString();
    router.push(query ? `${basePath}?${query}` : basePath);
  }

  return (
    <div className="mt-4.5">
      <div className="mb-2.5 text-[13px] font-semibold text-navy">{attribute.label}</div>
      <div className="flex items-center gap-2">
        <label className="sr-only" htmlFor={`${minKey}-input`}>
          {attribute.label} mínimo
        </label>
        <input
          id={`${minKey}-input`}
          type="number"
          min={0}
          inputMode="numeric"
          placeholder="Mín."
          value={minValue}
          onChange={(event) => setMinValue(event.target.value)}
          className="w-full rounded-input border border-line bg-white px-3 py-2 text-sm text-ink"
        />
        <span className="text-grafito">–</span>
        <label className="sr-only" htmlFor={`${maxKey}-input`}>
          {attribute.label} máximo
        </label>
        <input
          id={`${maxKey}-input`}
          type="number"
          min={0}
          inputMode="numeric"
          placeholder="Máx."
          value={maxValue}
          onChange={(event) => setMaxValue(event.target.value)}
          className="w-full rounded-input border border-line bg-white px-3 py-2 text-sm text-ink"
        />
        <button
          type="button"
          onClick={applyRange}
          disabled={rangeError}
          className="shrink-0 rounded-input bg-navy px-3.5 py-2 text-xs font-semibold text-white disabled:opacity-40"
        >
          Aplicar
        </button>
      </div>
      {rangeError ? (
        <p role="alert" className="mt-1.5 text-[12.5px] font-semibold text-error">
          El mínimo no puede ser mayor que el máximo.
        </p>
      ) : null}
    </div>
  );
}

export function CatalogFilters({
  basePath,
  brands,
  attributes,
}: {
  basePath: string;
  brands: { slug: string; name: string }[];
  attributes: FilterableAttributeDefinition[];
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Same focus-trap/scroll-lock/restore pattern as GalleryLightbox — this
  // drawer is functionally a modal on mobile, so it gets the same modal
  // semantics rather than a plain overlay <div>.
  useEffect(() => {
    if (!mobileOpen) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMobileOpen(false);
        return;
      }
      if (event.key === 'Tab') {
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
      previouslyFocused.current?.focus();
    };
  }, [mobileOpen]);

  const gender = searchParams.get('gender');
  const shape = searchParams.get('shape');
  const material = searchParams.get('material');
  const color = searchParams.get('color');
  const brand = searchParams.get('brand');
  const price = searchParams.get('price') ?? 'Todos';
  const availableOnly = searchParams.get('availableOnly') === '1';

  function onPriceChange(value: string) {
    router.push(buildFilterHref(basePath, searchParams, 'price', value === 'Todos' ? null : value));
  }

  function onAvailableChange(checked: boolean) {
    router.push(buildFilterHref(basePath, searchParams, 'availableOnly', checked ? '1' : null));
  }

  const panel = (
    <div className="rounded-card border border-line bg-white p-5.5 shadow-brand-sm">
      <div className="mb-1.5 flex items-center justify-between">
        <h3 className="text-[17px] font-semibold">Filtros</h3>
        <Link href={basePath} className="text-[12.5px] font-semibold text-fucsia">
          Limpiar
        </Link>
      </div>

      {brands.length > 0 ? (
        <div className="mt-4">
          <div className="mb-2.5 text-[13px] font-semibold text-navy">Marca</div>
          <div className="flex flex-wrap gap-1.5">
            <Link
              href={buildFilterHref(basePath, searchParams, 'brand', null)}
              aria-current={!brand}
              className={chipClass(!brand)}
            >
              Todas
            </Link>
            {brands.map((option) => (
              <Link
                key={option.slug}
                href={buildToggleHref(basePath, searchParams, 'brand', option.slug)}
                aria-current={brand === option.slug}
                className={chipClass(brand === option.slug)}
              >
                {option.name}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-4">
        <div className="mb-2.5 text-[13px] font-semibold text-navy">Público</div>
        <div className="flex flex-wrap gap-1.5">
          <Link
            href={buildFilterHref(basePath, searchParams, 'gender', null)}
            aria-current={!gender}
            className={chipClass(!gender)}
          >
            Todos
          </Link>
          {GENDER_OPTIONS.map((option) => (
            <Link
              key={option}
              href={buildFilterHref(basePath, searchParams, 'gender', option)}
              aria-current={gender === option}
              className={chipClass(gender === option)}
            >
              {GENDER_LABELS[option]}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-4.5">
        <div className="mb-2.5 text-[13px] font-semibold text-navy">Forma</div>
        <div className="flex flex-wrap gap-1.5">
          <Link
            href={buildFilterHref(basePath, searchParams, 'shape', null)}
            aria-current={!shape}
            className={chipClass(!shape)}
          >
            Todas
          </Link>
          {SHAPE_OPTIONS.map((option) => (
            <Link
              key={option}
              href={buildFilterHref(basePath, searchParams, 'shape', option)}
              aria-current={shape === option}
              className={chipClass(shape === option)}
            >
              {SHAPE_LABELS[option]}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-4.5">
        <div className="mb-2.5 text-[13px] font-semibold text-navy">Material</div>
        <div className="flex flex-wrap gap-1.5">
          <Link
            href={buildFilterHref(basePath, searchParams, 'material', null)}
            aria-current={!material}
            className={chipClass(!material)}
          >
            Todos
          </Link>
          {MATERIAL_OPTIONS.map((option) => (
            <Link
              key={option}
              href={buildFilterHref(basePath, searchParams, 'material', option)}
              aria-current={material === option}
              className={chipClass(material === option)}
            >
              {MATERIAL_LABELS[option]}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-4.5">
        <div className="mb-2.5 text-[13px] font-semibold text-navy">Color</div>
        <div className="flex flex-wrap gap-2.5">
          {Object.entries(COLOR_SWATCHES).map(([name, hex]) => (
            <Link
              key={name}
              href={buildToggleHref(basePath, searchParams, 'color', name)}
              aria-label={name}
              aria-current={color === name}
              title={name}
              className="h-[26px] w-[26px] rounded-full border-2 border-white"
              style={{
                backgroundColor: hex,
                boxShadow: color === name ? '0 0 0 2px #E5127D' : '0 0 0 1px #d7dceb',
              }}
            />
          ))}
        </div>
      </div>

      <div className="mt-4.5">
        <div className="mb-2.5 text-[13px] font-semibold text-navy">Rango de precio</div>
        <select
          value={price}
          onChange={(event) => onPriceChange(event.target.value)}
          aria-label="Rango de precio"
          className="w-full rounded-input border border-line bg-white px-3 py-2.5 text-sm text-ink"
        >
          <option value="Todos">Todos los precios</option>
          <option value="low">Menos de $35.000</option>
          <option value="mid">$35.000 – $42.000</option>
          <option value="high">Más de $42.000</option>
        </select>
      </div>

      <label className="mt-4.5 flex cursor-pointer items-center gap-2.5 text-sm text-grafito">
        <input
          type="checkbox"
          checked={availableOnly}
          onChange={(event) => onAvailableChange(event.target.checked)}
          className="h-[18px] w-[18px] accent-fucsia"
        />
        Solo disponibles
      </label>

      {/* Fase 12: un control por atributo de categoría activo/filtrable — nunca hardcodeado, se agrega/quita desde el admin sin cambio de código. */}
      {attributes.map((attribute) => (
        <DynamicAttributeFilter key={attribute.id} attribute={attribute} basePath={basePath} searchParams={searchParams} router={router} />
      ))}
    </div>
  );

  return (
    <>
      <div className="mb-5.5 flex items-center gap-3 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-expanded={mobileOpen}
          className="flex items-center gap-2 rounded-input border border-line bg-white px-4.5 py-3 font-semibold text-navy"
        >
          Filtros
        </button>
      </div>

      <aside className="hidden lg:block">{panel}</aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar filtros"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Filtros del catálogo"
            className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-[24px] bg-white p-5"
          >
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Cerrar filtros"
              className="mb-2 ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-gray text-navy"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
            {panel}
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="mt-4.5 w-full rounded-input bg-brand-gradient py-3.5 font-semibold text-white"
            >
              Ver resultados
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
