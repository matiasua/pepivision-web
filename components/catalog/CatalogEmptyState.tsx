import Link from 'next/link';

/** `clearHref` is category-scoped (`/catalogo/[categorySlug]`) so "Limpiar filtros" clears filters within the category instead of leaving it. */
export function CatalogEmptyState({ clearHref }: { clearHref: string }) {
  return (
    <div className="py-16 text-center text-grafito">
      <div className="text-[17px] font-semibold text-navy">Sin resultados</div>
      <p className="mt-2">Prueba ajustando los filtros o el buscador.</p>
      <Link href={clearHref} className="mt-4 inline-block font-semibold text-fucsia">
        Limpiar filtros
      </Link>
    </div>
  );
}
