import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Container } from '@/components/Container';
import { ChevronRightIcon } from '@/components/icons';
import { getCategoryPicker } from '@/modules/catalog/service';

export const metadata: Metadata = {
  title: 'Catálogo',
  description: 'Explora nuestras categorías: lentes ópticos y lentes de sol.',
};

// Sin esto, Next.js congelaría el listado de categorías en build time — una
// categoría creada/editada/ocultada desde el admin no aparecería hasta el
// próximo rebuild. Mismo motivo que /catalogo/[categorySlug] y /cotizador.
export const dynamic = 'force-dynamic';

export default async function CatalogoPage() {
  const categories = await getCategoryPicker();

  return (
    <>
      <section className="bg-brand-gradient-soft">
        <Container className="py-11">
          <h1 className="text-[38px] font-bold">Catálogo</h1>
          <p className="mt-2.5 max-w-xl text-[17px] text-grafito">
            Elige una categoría para ver los modelos disponibles. Todos los precios son referenciales.
          </p>
        </Container>
      </section>

      <section className="py-7">
        <Container>
          {categories.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((category) => (
                <Link
                  key={category.slug}
                  href={`/catalogo/${category.slug}`}
                  className="flex flex-col overflow-hidden rounded-card border border-line bg-white shadow-brand-sm transition-transform duration-200 hover:-translate-y-1"
                >
                  <div className="relative aspect-[16/9] bg-gray">
                    {category.imagePath ? (
                      <Image src={category.imagePath} alt={category.name} fill className="object-cover" unoptimized />
                    ) : null}
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <div className="font-display text-[19px] font-semibold text-navy">{category.name}</div>
                    {category.shortDescription ? (
                      <p className="mt-1.5 text-[13.5px] text-grafito">{category.shortDescription}</p>
                    ) : null}
                    <div className="mt-auto flex items-center gap-1.5 pt-4 text-[13.5px] font-semibold text-fucsia">
                      Ver catálogo <ChevronRightIcon className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center text-grafito">
              <div className="text-[17px] font-semibold text-navy">Sin categorías disponibles</div>
              <p className="mt-2">Vuelve a intentarlo más tarde.</p>
            </div>
          )}
        </Container>
      </section>
    </>
  );
}
