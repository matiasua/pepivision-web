import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Container } from '@/components/Container';
import { CatalogFilters } from '@/components/catalog/CatalogFilters';
import { CatalogSearchInput } from '@/components/catalog/CatalogSearchInput';
import { ProductCard } from '@/components/catalog/ProductCard';
import { CatalogEmptyState } from '@/components/catalog/CatalogEmptyState';
import { getCatalog, getCatalogBrandFilterOptions } from '@/modules/catalog/service';
import { parseCatalogFilters, type CatalogFilters as CatalogFiltersType } from '@/modules/catalog/schemas';

export const metadata: Metadata = {
  title: 'Catálogo de armazones',
  description: 'Explora nuestros modelos de armazones y filtra según tu estilo. Todos los precios son referenciales.',
};

type SearchParams = Record<string, string | string[] | undefined>;

// Only the results (count + grid) depend on the DB fetch — the hero, search
// input and filters sidebar render immediately. Deliberately NOT a route-level
// `loading.tsx`: that file convention wraps this whole segment *and* the
// nested `/catalogo/[slug]` route in the same Suspense boundary, which forces
// Next.js to flush a 200 shell before that route's `notFound()` can run,
// breaking its 404 status. A locally scoped <Suspense> avoids that.
async function CatalogResults({ filters }: { filters: CatalogFiltersType }) {
  const products = await getCatalog(filters);

  return (
    <div>
      <div className="mb-4 text-sm text-grafito">{products.length} modelos encontrados</div>

      {products.length > 0 ? (
        <div className="grid grid-cols-2 gap-5 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <CatalogEmptyState />
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

export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const filters = parseCatalogFilters(resolvedSearchParams);
  const brandOptions = await getCatalogBrandFilterOptions();

  return (
    <>
      <section className="bg-brand-gradient-soft">
        <Container className="py-11">
          <h1 className="text-[38px] font-bold">Catálogo de armazones</h1>
          <p className="mt-2.5 max-w-xl text-[17px] text-grafito">
            Explora nuestros modelos y filtra según tu estilo. Todos los precios son referenciales.
          </p>
        </Container>
      </section>

      <section className="py-7">
        <Container>
          <div className="mb-5.5">
            <CatalogSearchInput />
          </div>

          <div className="grid grid-cols-1 items-start gap-7 lg:grid-cols-[260px_1fr]">
            <CatalogFilters brands={brandOptions} />

            <Suspense key={JSON.stringify(filters)} fallback={<CatalogResultsSkeleton />}>
              <CatalogResults filters={filters} />
            </Suspense>
          </div>
        </Container>
      </section>
    </>
  );
}
