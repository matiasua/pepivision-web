import Image from 'next/image';
import Link from 'next/link';
import type { OfferingCardView } from '@/modules/catalog/service';
import { ImagePlaceholder } from './ImagePlaceholder';

// `unoptimized`: see the comment on ProductGallery — next/image's optimizer
// can't fetch from MinIO's private-network address in this environment.
export function RelatedProducts({ offerings }: { offerings: OfferingCardView[] }) {
  if (offerings.length === 0) return null;

  return (
    <section className="py-8">
      <h2 className="mb-5 text-2xl font-bold">Productos relacionados</h2>
      <div className="grid grid-cols-2 gap-5 lg:grid-cols-3">
        {offerings.map((offering) => (
          <Link
            key={offering.id}
            href={`/catalogo/${offering.categorySlug}/${offering.offeringSlug}`}
            className="overflow-hidden rounded-2xl border border-line bg-white shadow-brand-sm transition-transform duration-200 hover:-translate-y-1"
          >
            <div className="relative aspect-[4/3] bg-gray">
              {offering.coverImageUrl ? (
                <Image src={offering.coverImageUrl} alt={offering.name} fill className="object-cover" unoptimized />
              ) : (
                <ImagePlaceholder label="Foto armazón" />
              )}
            </div>
            <div className="p-4">
              <div className="font-display font-semibold text-navy">{offering.name}</div>
              <div className="mt-1.5 font-display font-bold text-fucsia">{offering.priceLabel}</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
