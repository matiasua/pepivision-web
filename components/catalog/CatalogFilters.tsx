'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Gender, ProductMaterial, ProductShape } from '@prisma/client';
import { GENDER_LABELS, MATERIAL_LABELS, SHAPE_LABELS } from '@/modules/catalog/labels';
import { buildFilterHref, buildToggleHref } from '@/modules/catalog/filter-url';
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

export function CatalogFilters({ brands }: { brands: { slug: string; name: string }[] }) {
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
    router.push(buildFilterHref(searchParams, 'price', value === 'Todos' ? null : value));
  }

  function onAvailableChange(checked: boolean) {
    router.push(buildFilterHref(searchParams, 'availableOnly', checked ? '1' : null));
  }

  const panel = (
    <div className="rounded-card border border-line bg-white p-5.5 shadow-brand-sm">
      <div className="mb-1.5 flex items-center justify-between">
        <h3 className="text-[17px] font-semibold">Filtros</h3>
        <Link href="/catalogo" className="text-[12.5px] font-semibold text-fucsia">
          Limpiar
        </Link>
      </div>

      {brands.length > 0 ? (
        <div className="mt-4">
          <div className="mb-2.5 text-[13px] font-semibold text-navy">Marca</div>
          <div className="flex flex-wrap gap-1.5">
            <Link href={buildFilterHref(searchParams, 'brand', null)} aria-current={!brand} className={chipClass(!brand)}>
              Todas
            </Link>
            {brands.map((option) => (
              <Link
                key={option.slug}
                href={buildToggleHref(searchParams, 'brand', option.slug)}
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
          <Link href={buildFilterHref(searchParams, 'gender', null)} aria-current={!gender} className={chipClass(!gender)}>
            Todos
          </Link>
          {GENDER_OPTIONS.map((option) => (
            <Link
              key={option}
              href={buildFilterHref(searchParams, 'gender', option)}
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
          <Link href={buildFilterHref(searchParams, 'shape', null)} aria-current={!shape} className={chipClass(!shape)}>
            Todas
          </Link>
          {SHAPE_OPTIONS.map((option) => (
            <Link
              key={option}
              href={buildFilterHref(searchParams, 'shape', option)}
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
          <Link href={buildFilterHref(searchParams, 'material', null)} aria-current={!material} className={chipClass(!material)}>
            Todos
          </Link>
          {MATERIAL_OPTIONS.map((option) => (
            <Link
              key={option}
              href={buildFilterHref(searchParams, 'material', option)}
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
              href={buildToggleHref(searchParams, 'color', name)}
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
