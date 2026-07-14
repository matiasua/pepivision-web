import Image from 'next/image';
import Link from 'next/link';
import { WhatsAppIcon } from '@/components/icons';
import type { CatalogProductView } from '@/modules/catalog/service';
import { ImagePlaceholder } from './ImagePlaceholder';

// `unoptimized`: see the comment on ProductGallery — next/image's optimizer
// can't fetch from MinIO's private-network address in this environment.
export function ProductCard({ product }: { product: CatalogProductView }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-card border border-line bg-white shadow-brand-sm transition-transform duration-200 hover:-translate-y-1">
      <Link href={`/catalogo/${product.slug}`} className="relative block aspect-[4/3] bg-gray">
        {product.coverImageUrl ? (
          <Image src={product.coverImageUrl} alt={product.name} fill className="object-cover" unoptimized />
        ) : (
          <ImagePlaceholder label="Foto armazón" />
        )}
        {product.badgeLabel ? (
          <span className="absolute left-3 top-3 rounded-pill bg-navy px-2.5 py-1 text-[11.5px] font-semibold text-white">
            {product.badgeLabel}
          </span>
        ) : null}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        {product.brandName ? (
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[#5b6b85]">{product.brandName}</div>
        ) : null}
        <div className="font-display text-[16.5px] font-semibold text-navy">{product.name}</div>
        <div className="mt-0.5 text-xs text-[#5b6b85]">
          {product.code} · {product.shapeLabel} · {product.materialLabel}
        </div>
        {product.colors.length > 0 ? (
          <div className="mt-2.5 flex gap-1.5">
            {product.colors.map((color) => (
              <span
                key={color.id}
                role="img"
                aria-label={color.name}
                title={color.name}
                className="h-4 w-4 rounded-full border-[1.5px] border-white shadow-[0_0_0_1px_#d7dceb]"
                style={{ backgroundColor: color.hex }}
              />
            ))}
          </div>
        ) : null}
        <div className="mt-3.5 flex items-center justify-between">
          <div className="font-display text-[19px] font-bold text-fucsia">{product.priceLabel}</div>
          <span className={`text-xs font-semibold ${product.available ? 'text-success' : 'text-[#b45309]'}`}>
            {product.availabilityLabel}
          </span>
        </div>
        <div className="mt-auto flex gap-2 pt-3.5">
          <Link
            href={`/catalogo/${product.slug}`}
            className="flex-1 rounded-[11px] bg-navy py-2.5 text-center text-[13.5px] font-semibold text-white"
          >
            Ver detalles
          </Link>
          <a
            href={product.waInquiryHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Consultar por WhatsApp"
            className="flex w-11 items-center justify-center rounded-[11px] bg-whatsapp"
          >
            <WhatsAppIcon className="h-[19px] w-[19px] text-white" />
          </a>
        </div>
      </div>
    </div>
  );
}
