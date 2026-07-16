import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '@/components/Container';
import { LinkButton } from '@/components/Button';
import { ProductGallery } from '@/components/catalog/ProductGallery';
import { RelatedProducts } from '@/components/catalog/RelatedProducts';
import { OtherCategoryOfferings } from '@/components/catalog/OtherCategoryOfferings';
import { WhatsAppIcon, ChevronRightIcon } from '@/components/icons';
import { getOfferingDetail } from '@/modules/catalog/service';

type Params = { categorySlug: string; offeringSlug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { categorySlug, offeringSlug } = await params;
  const result = await getOfferingDetail(categorySlug, offeringSlug);
  if (!result) return {};

  return {
    title: result.offering.name,
    description: result.offering.description ?? `${result.offering.name} — ${result.offering.priceLabel}.`,
  };
}

export default async function OfertaPage({ params }: { params: Promise<Params> }) {
  const { categorySlug, offeringSlug } = await params;
  const result = await getOfferingDetail(categorySlug, offeringSlug);
  if (!result) notFound();

  const { offering, related } = result;

  return (
    <Container size="wide" className="py-6">
      <Link href={`/catalogo/${categorySlug}`} className="mb-5 inline-flex items-center gap-1.5 font-semibold text-grafito">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true">
          <path d="M19 12H5M11 6l-6 6 6 6" />
        </svg>
        Volver a {offering.categoryName}
      </Link>

      <div className="grid grid-cols-1 items-start gap-11 lg:grid-cols-2">
        <ProductGallery name={offering.name} images={offering.images} colors={offering.colors} />

        <div>
          {offering.badgeLabel ? (
            <span className="mb-3 inline-block rounded-pill bg-navy px-3.5 py-1.5 text-xs font-semibold text-white">
              {offering.badgeLabel}
            </span>
          ) : null}
          {offering.brandName ? (
            <div className="text-[12.5px] font-semibold uppercase tracking-wide text-[#5b6b85]">{offering.brandName}</div>
          ) : null}
          <h1 className="text-[34px] font-bold">{offering.name}</h1>
          <div className="mt-1.5 text-sm text-[#5b6b85]">Código {offering.code}</div>
          <div className="mt-4 font-display text-[30px] font-bold text-fucsia">{offering.priceLabel}</div>
          <div className="mt-0.5 text-[13px] text-grafito">
            Valor &quot;desde&quot;. El precio final depende del armazón, cristal, aumento y tratamientos.
          </div>
          {offering.description ? (
            <p className="mt-4.5 text-[15.5px] leading-relaxed text-grafito">{offering.description}</p>
          ) : null}

          {offering.colors.length > 0 ? (
            <div className="mt-5.5">
              <div className="mb-2.5 text-sm font-semibold text-navy">Colores disponibles</div>
              <div className="flex flex-wrap gap-3">
                {offering.colors.map((color) => (
                  <div key={color.id} className="flex items-center gap-1.5">
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
              <div className="text-xs text-[#5b6b85]">Material</div>
              <div className="mt-0.5 font-semibold text-navy">{offering.materialLabel}</div>
            </div>
            <div className="rounded-2xl bg-gray p-3.5">
              <div className="text-xs text-[#5b6b85]">Medidas</div>
              <div className="mt-0.5 font-semibold text-navy">{offering.sizes ?? '—'}</div>
            </div>
            <div className="rounded-2xl bg-gray p-3.5">
              <div className="text-xs text-[#5b6b85]">Forma</div>
              <div className="mt-0.5 font-semibold text-navy">{offering.shapeLabel}</div>
            </div>
            <div className="rounded-2xl bg-gray p-3.5">
              <div className="text-xs text-[#5b6b85]">Disponibilidad</div>
              <div className={`mt-0.5 font-semibold ${offering.available ? 'text-success' : 'text-[#b45309]'}`}>
                {offering.availabilityLabel}
              </div>
            </div>
          </div>

          <OtherCategoryOfferings offerings={offering.otherCategoryOfferings} />

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
            <LinkButton href={`/cotizador?productId=${offering.productId}`} variant="primary" className="w-full">
              Cotizar este modelo
            </LinkButton>
            <div className="flex gap-2.5">
              <LinkButton href={offering.waQuoteHref} variant="whatsapp" className="flex-1">
                <WhatsAppIcon className="h-[18px] w-[18px]" />
                Enviar por WhatsApp
              </LinkButton>
              <LinkButton href={offering.waInquiryHref} variant="outline" className="flex-1">
                Consultar disponibilidad
              </LinkButton>
            </div>
          </div>
        </div>
      </div>

      <RelatedProducts offerings={related} />
    </Container>
  );
}
