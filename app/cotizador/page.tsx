import type { Metadata } from 'next';
import { Container } from '@/components/Container';
import { QuoteWizard } from '@/components/quote/QuoteWizard';
import { getCatalog } from '@/modules/catalog/service';

export const metadata: Metadata = {
  title: 'Cotizador de lentes',
  description: 'En 5 pasos te preparamos un presupuesto a tu medida.',
};

// Without this, Next.js would statically render the frame list at build
// time and freeze it — new/edited products wouldn't appear here again
// until the next rebuild. Same reasoning as /catalogo and /catalogo/[slug].
export const dynamic = 'force-dynamic';

export default async function CotizadorPage({
  searchParams,
}: {
  searchParams: Promise<{ productId?: string }>;
}) {
  const { productId } = await searchParams;
  const products = await getCatalog({ availableOnly: false });
  const frameOptions = products.map((product) => ({
    id: product.id,
    label: product.brandName
      ? `${product.brandName} — ${product.name} · ${product.code} · ${product.priceLabel}`
      : `${product.name} · ${product.code} · ${product.priceLabel}`,
    colors: product.colors,
  }));

  // "Cotizar este modelo" on a product page links here with ?productId=…
  // Ignore it if it doesn't match a real, currently-listed product instead
  // of trusting it blindly — the wizard still requires an explicit color
  // pick either way (see QuoteWizard.tsx).
  const initialProductId = frameOptions.some((option) => option.id === productId) ? productId : undefined;

  return (
    <section className="py-8">
      <Container size="narrow">
        <div className="text-center">
          <h1 className="text-[34px] font-bold">Cotizador de lentes</h1>
          <p className="mt-2.5 text-base text-grafito">En 5 pasos te preparamos un presupuesto a tu medida.</p>
        </div>

        <QuoteWizard frameOptions={frameOptions} initialProductId={initialProductId} />
      </Container>
    </section>
  );
}
