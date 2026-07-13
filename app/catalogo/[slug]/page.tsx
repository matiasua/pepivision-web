import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '@/components/Container';
import { LinkButton } from '@/components/Button';
import { ProductGallery } from '@/components/catalog/ProductGallery';
import { RelatedProducts } from '@/components/catalog/RelatedProducts';
import { WhatsAppIcon, ChevronRightIcon } from '@/components/icons';
import { getProductBySlug } from '@/modules/catalog/service';

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await getProductBySlug(slug);
  if (!result) return {};

  return {
    title: result.product.name,
    description: result.product.description ?? `${result.product.name} — ${result.product.priceLabel}.`,
  };
}

export default async function ProductoPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const result = await getProductBySlug(slug);
  if (!result) notFound();

  const { product, related } = result;

  return (
    <Container size="wide" className="py-6">
      <Link href="/catalogo" className="mb-5 inline-flex items-center gap-1.5 font-semibold text-grafito">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true">
          <path d="M19 12H5M11 6l-6 6 6 6" />
        </svg>
        Volver al catálogo
      </Link>

      <div className="grid grid-cols-1 items-start gap-11 lg:grid-cols-2">
        <ProductGallery
          name={product.name}
          mainImageUrl={product.mainImageUrl}
          frontImageUrl={product.frontImageUrl}
          sideImageUrl={product.sideImageUrl}
        />

        <div>
          {product.badgeLabel ? (
            <span className="mb-3 inline-block rounded-pill bg-navy px-3.5 py-1.5 text-xs font-semibold text-white">
              {product.badgeLabel}
            </span>
          ) : null}
          <h1 className="text-[34px] font-bold">{product.name}</h1>
          <div className="mt-1.5 text-sm text-[#93a0bd]">Código {product.code}</div>
          <div className="mt-4 font-display text-[30px] font-bold text-fucsia">{product.priceLabel}</div>
          <div className="mt-0.5 text-[13px] text-grafito">
            Valor &quot;desde&quot;. El precio final depende del armazón, cristal, aumento y tratamientos.
          </div>
          {product.description ? (
            <p className="mt-4.5 text-[15.5px] leading-relaxed text-grafito">{product.description}</p>
          ) : null}

          {product.colors.length > 0 ? (
            <div className="mt-5.5">
              <div className="mb-2.5 text-sm font-semibold text-navy">Colores disponibles</div>
              <div className="flex flex-wrap gap-3">
                {product.colors.map((color) => (
                  <div key={color.name} className="flex items-center gap-1.5">
                    <span
                      className="h-[22px] w-[22px] rounded-full border-2 border-white shadow-[0_0_0_1px_#d7dceb]"
                      style={{ backgroundColor: color.hex }}
                    />
                    <span className="text-[13px] text-grafito">{color.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-5.5 grid grid-cols-2 gap-3.5">
            <div className="rounded-2xl bg-gray p-3.5">
              <div className="text-xs text-[#93a0bd]">Material</div>
              <div className="mt-0.5 font-semibold text-navy">{product.materialLabel}</div>
            </div>
            <div className="rounded-2xl bg-gray p-3.5">
              <div className="text-xs text-[#93a0bd]">Medidas</div>
              <div className="mt-0.5 font-semibold text-navy">{product.sizes ?? '—'}</div>
            </div>
            <div className="rounded-2xl bg-gray p-3.5">
              <div className="text-xs text-[#93a0bd]">Forma</div>
              <div className="mt-0.5 font-semibold text-navy">{product.shapeLabel}</div>
            </div>
            <div className="rounded-2xl bg-gray p-3.5">
              <div className="text-xs text-[#93a0bd]">Disponibilidad</div>
              <div className={`mt-0.5 font-semibold ${product.available ? 'text-success' : 'text-[#c88a1a]'}`}>
                {product.availabilityLabel}
              </div>
            </div>
          </div>

          <div className="mt-4.5 rounded-2xl bg-brand-gradient-soft p-4.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-navy">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--color-blue)" strokeWidth={2} aria-hidden="true">
                <circle cx="7" cy="14" r="4" />
                <circle cx="17" cy="14" r="4" />
                <path d="M11 14a1 1 0 0 1 2 0" />
              </svg>
              Cristales que puedes incorporar
            </div>
            <p className="mt-2 text-[13.5px] leading-relaxed text-grafito">
              Monofocales, bifocales o multifocales, con tratamientos como filtro de luz azul, antirreflejo,
              fotocromático y protección UV.{' '}
              <Link href="/cristales" className="inline-flex items-center gap-1 font-semibold text-fucsia">
                Ver tipos de cristales <ChevronRightIcon className="h-3.5 w-3.5" />
              </Link>
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-2.5">
            <LinkButton href="/cotizador" variant="primary" className="w-full">
              Cotizar este modelo
            </LinkButton>
            <div className="flex gap-2.5">
              <LinkButton href={product.waQuoteHref} variant="whatsapp" className="flex-1">
                <WhatsAppIcon className="h-[18px] w-[18px]" />
                Enviar por WhatsApp
              </LinkButton>
              <LinkButton href={product.waInquiryHref} variant="outline" className="flex-1">
                Consultar disponibilidad
              </LinkButton>
            </div>
          </div>
        </div>
      </div>

      <RelatedProducts products={related} />
    </Container>
  );
}
