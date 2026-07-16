'use client';

import { useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { buildFilterHref } from '@/modules/catalog/filter-url';

export function CatalogSearchInput({ basePath }: { basePath: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlQuery = searchParams.get('q') ?? '';
  const [value, setValue] = useState(urlQuery);
  const [syncedQuery, setSyncedQuery] = useState(urlQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset the field when `q` changes from outside this input (e.g. the
  // "Limpiar filtros" link) — adjusting state during render instead of an
  // effect, per https://react.dev/learn/you-might-not-need-an-effect.
  if (urlQuery !== syncedQuery) {
    setSyncedQuery(urlQuery);
    setValue(urlQuery);
  }

  function onChange(next: string) {
    setValue(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      router.push(buildFilterHref(basePath, searchParams, 'q', next.trim() || null));
    }, 300);
  }

  return (
    <div className="relative flex-1">
      <svg
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#5b6b85]"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Busca por nombre o código (ej: Aurora, PV-102)"
        aria-label="Buscar armazón"
        className="w-full rounded-input border border-line bg-white py-3.5 pl-11 pr-4 outline-none focus-visible:border-blue"
      />
    </div>
  );
}
