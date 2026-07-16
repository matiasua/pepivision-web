import Link from 'next/link';
import { ChevronRightIcon } from '@/components/icons';
import type { OtherCategoryOfferingLink } from '@/modules/catalog/service';

/** "También disponible como" (5.5) — enlaces cruzados del mismo producto en sus otras categorías públicas. Distinto de RelatedProducts (ofertas similares dentro de la misma categoría). */
export function OtherCategoryOfferings({ offerings }: { offerings: OtherCategoryOfferingLink[] }) {
  if (offerings.length === 0) return null;

  return (
    <div className="mt-4.5 rounded-2xl border border-line bg-white p-4.5">
      <div className="text-sm font-semibold text-navy">También disponible como</div>
      <div className="mt-2.5 flex flex-col gap-2">
        {offerings.map((offering) => (
          <Link
            key={offering.categorySlug}
            href={`/catalogo/${offering.categorySlug}/${offering.offeringSlug}`}
            className="flex items-center justify-between rounded-input border border-line bg-gray px-3.5 py-2.5 text-[13.5px] font-semibold text-navy"
          >
            {offering.categoryName}
            <ChevronRightIcon className="h-3.5 w-3.5" />
          </Link>
        ))}
      </div>
    </div>
  );
}
