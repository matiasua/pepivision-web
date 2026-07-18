import type { Metadata } from 'next';
import { Container } from '@/components/Container';
import { QuoteWizard } from '@/components/quote/QuoteWizard';
import { listQuoteCategories, getQuoteOfferingContext } from '@/modules/requests/quote-wizard-service';

export const metadata: Metadata = {
  title: 'Cotizador de lentes',
  description: 'Te preparamos un presupuesto a tu medida, paso a paso.',
};

// Sin esto, Next.js congelaría el listado de categorías/ofertas en build
// time — mismo criterio que /catalogo y /catalogo/[slug].
export const dynamic = 'force-dynamic';

export default async function CotizadorPage({
  searchParams,
}: {
  searchParams: Promise<{ categorySlug?: string; offeringId?: string }>;
}) {
  const { categorySlug, offeringId } = await searchParams;
  const categories = await listQuoteCategories();

  // "Cotizar este modelo" en una ficha de oferta enlaza aquí con
  // ?categorySlug=...&offeringId=... — nunca se confía en esto a ciegas:
  // se re-resuelve server-side (categoría activa/visible, oferta
  // perteneciente a esa categoría, producto/colores reales) y si algo no
  // calza, el wizard simplemente arranca desde el selector de categoría en
  // vez de asumir silenciosamente lentes-opticos o inventar una oferta.
  let initialOffering = null;
  if (categorySlug && offeringId) {
    // Solo entre las ya filtradas activas/visibles arriba — una categoría
    // inactiva u oculta nunca sirve de contexto inicial, aunque el slug
    // exista en la base de datos.
    const category = categories.find((c) => c.slug === categorySlug);
    if (category) {
      const result = await getQuoteOfferingContext(category.id, offeringId);
      if (result.ok) initialOffering = result.data;
    }
  }

  return (
    <section className="py-8">
      <Container size="narrow">
        <div className="text-center">
          <h1 className="text-[34px] font-bold">Cotizador de lentes</h1>
          <p className="mt-2.5 text-base text-grafito">Te preparamos un presupuesto a tu medida, paso a paso.</p>
        </div>

        <QuoteWizard categories={categories} initialOffering={initialOffering} />
      </Container>
    </section>
  );
}
