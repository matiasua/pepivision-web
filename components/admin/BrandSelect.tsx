'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';

export interface BrandOption {
  id: string;
  name: string;
  logoPath: string | null;
}

/**
 * Searchable brand picker — a plain filtered list, not a <select>, so each
 * option can show its logo next to its name (per design.md's "selector
 * profesional"). No combobox library: with ~20 brands a simple
 * text-filter + button list is enough and keeps this dependency-free.
 */
export function BrandSelect({
  brands,
  value,
  onChange,
}: {
  brands: BrandOption[];
  value: string;
  onChange: (brandId: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const selected = brands.find((b) => b.id === value) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return brands;
    return brands.filter((b) => b.name.toLowerCase().includes(q));
  }, [brands, query]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 rounded-input border border-line bg-white px-3.5 py-3 text-left outline-none"
      >
        {selected ? (
          <>
            {selected.logoPath ? (
              <span className="relative h-6 w-10 shrink-0">
                <Image src={selected.logoPath} alt="" fill className="object-contain" sizes="40px" />
              </span>
            ) : null}
            <span className="truncate text-ink">{selected.name}</span>
          </>
        ) : (
          <span className="text-[#93a0bd]">Selecciona una marca…</span>
        )}
        <span className="ml-auto shrink-0 text-xs text-[#93a0bd]">{open ? '▲' : '▼'}</span>
      </button>

      {open ? (
        <div className="absolute z-20 mt-1.5 w-full rounded-2xl border border-line bg-white p-2 shadow-brand">
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar marca…"
            aria-label="Buscar marca"
            className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none"
          />
          <div role="listbox" className="mt-1.5 max-h-64 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-center text-xs text-grafito">No se encontraron marcas.</div>
            ) : (
              filtered.map((brand) => (
                <button
                  key={brand.id}
                  type="button"
                  role="option"
                  aria-selected={brand.id === value}
                  onClick={() => {
                    onChange(brand.id);
                    setQuery('');
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm ${
                    brand.id === value ? 'bg-brand-gradient-soft text-fucsia' : 'text-ink hover:bg-gray'
                  }`}
                >
                  {brand.logoPath ? (
                    <span className="relative h-6 w-10 shrink-0">
                      <Image src={brand.logoPath} alt="" fill className="object-contain" sizes="40px" />
                    </span>
                  ) : (
                    <span className="h-6 w-10 shrink-0" />
                  )}
                  <span className="truncate">{brand.name}</span>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
