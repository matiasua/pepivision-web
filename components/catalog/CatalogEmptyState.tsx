import Link from 'next/link';

export function CatalogEmptyState() {
  return (
    <div className="py-16 text-center text-grafito">
      <div className="text-[17px] font-semibold text-navy">Sin resultados</div>
      <p className="mt-2">Prueba ajustando los filtros o el buscador.</p>
      <Link href="/catalogo" className="mt-4 inline-block font-semibold text-fucsia">
        Limpiar filtros
      </Link>
    </div>
  );
}
