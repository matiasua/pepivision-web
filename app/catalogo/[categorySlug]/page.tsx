import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound, permanentRedirect } from 'next/navigation';
import { Container } from '@/components/Container';
import { CatalogFilters } from '@/components/catalog/CatalogFilters';
import { CatalogSearchInput } from '@/components/catalog/CatalogSearchInput';
import { OfferingCard } from '@/components/catalog/OfferingCard';
import { CatalogEmptyState } from '@/components/catalog/CatalogEmptyState';
import {
  getCategoryBrandFilterOptions,
  getCategorySummary,
  getCatalogForCategory,
  getLegacyRedirectTarget,
} from '@/modules/catalog/service';
import { parseCatalogFilters, type CatalogFilters as CatalogFiltersType } from '@/modules/catalog/schemas';

type Params = { categorySlug: string };
type SearchParams = Record<string, string | string[] | undefined>;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { categorySlug } = await params;
  const category = await getCategorySummary(categorySlug);
  if (!category) return {};

  return {
    title: category.name,
    description: category.shortDescription ?? `Explora nuestros modelos de ${category.name.toLowerCase()}.`,
  };
}

// Solo los resultados (contador + grilla) dependen del fetch a la BD — el
// hero, el buscador y el sidebar de filtros se renderizan de inmediato.
// Deliberadamente NO un `loading.tsx` a nivel de ruta: ese archivo envuelve
// todo este segmento *y* la ruta anidada `/catalogo/[categorySlug]/
// [offeringSlug]` en el mismo boundary de Suspense, forzando a Next.js a
// emitir un shell 200 antes de que el `notFound()` de esa ruta pueda
// correr, rompiendo su código de estado 404. Un <Suspense> acotado
// localmente evita eso.
async function CatalogResults({ categorySlug, filters }: { categorySlug: string; filters: CatalogFiltersType }) {
  const catalog = await getCatalogForCategory(categorySlug, filters);
  if (!catalog) notFound();

  return (
    <div>
      <div aria-live="polite" className="mb-4 text-sm text-grafito">
        {catalog.offerings.length} modelos encontrados
      </div>

      {catalog.offerings.length > 0 ? (
        <div className="grid grid-cols-2 gap-5 lg:grid-cols-3">
          {catalog.offerings.map((offering) => (
            <OfferingCard key={offering.id} offering={offering} />
          ))}
        </div>
      ) : (
        <CatalogEmptyState clearHref={`/catalogo/${categorySlug}`} />
      )}
    </div>
  );
}

function CatalogResultsSkeleton() {
  return (
    <div>
      <div className="mb-4 h-4 w-40 animate-pulse rounded bg-gray-2" />
      <div className="grid grid-cols-2 gap-5 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="overflow-hidden rounded-card border border-line bg-white shadow-brand-sm">
            <div className="aspect-[4/3] animate-pulse bg-gray" />
            <div className="p-4">
              <div className="h-3.5 w-2/3 animate-pulse rounded bg-gray-2" />
              <div className="mt-2.5 h-3 w-1/3 animate-pulse rounded bg-gray-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function CategoriaPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { categorySlug } = await params;
  const resolvedSearchParams = await searchParams;
  const filters = parseCatalogFilters(resolvedSearchParams);

  // Resuelto una vez aquí, fuera del <Suspense>, para saber qué mostrar en
  // el hero (nombre/descripción de la categoría) — CatalogResults vuelve a
  // resolver la categoría junto al listado filtrado y es quien decide el
  // notFound() real si la categoría deja de existir entre ambas llamadas.
  const category = await getCategorySummary(categorySlug);
  if (!category) {
    // Capa de compatibilidad (5.3): `/catalogo/[categorySlug]` y la antigua
    // `/catalogo/[slug]` (slug de producto) ocupan la misma forma de URL de
    // un solo segmento — Next.js no permite dos nombres de parámetro
    // distintos en la misma posición de ruta, así que ambos casos se
    // resuelven aquí. Si `categorySlug` no calza con ninguna categoría,
    // se intenta como slug legado de producto antes de devolver 404.
    const legacyTarget = await getLegacyRedirectTarget(categorySlug);
    if (legacyTarget) {
      permanentRedirect(`/catalogo/${legacyTarget.categorySlug}/${legacyTarget.offeringSlug}`);
    }
    notFound();
  }

  const brandOptions = await getCategoryBrandFilterOptions(categorySlug);
  const basePath = `/catalogo/${categorySlug}`;

  return (
    <>
      <section className="bg-brand-gradient-soft">
        <Container className="py-11">
          <h1 className="text-[38px] font-bold">{category.name}</h1>
          {category.shortDescription ? (
            <p className="mt-2.5 max-w-xl text-[17px] text-grafito">{category.shortDescription}</p>
          ) : null}
        </Container>
      </section>

      <section className="py-7">
        <Container>
          <div className="mb-5.5">
            <CatalogSearchInput basePath={basePath} />
          </div>

          <div className="grid grid-cols-1 items-start gap-7 lg:grid-cols-[260px_1fr]">
            <CatalogFilters basePath={basePath} brands={brandOptions} />

            <Suspense key={JSON.stringify(filters)} fallback={<CatalogResultsSkeleton />}>
              <CatalogResults categorySlug={categorySlug} filters={filters} />
            </Suspense>
          </div>
        </Container>
      </section>
    </>
  );
}
