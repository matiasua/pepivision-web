import Image from 'next/image';
import { ImagePlaceholder } from './ImagePlaceholder';

export function ProductGallery({
  name,
  mainImageUrl,
  frontImageUrl,
  sideImageUrl,
}: {
  name: string;
  mainImageUrl: string | null;
  frontImageUrl: string | null;
  sideImageUrl: string | null;
}) {
  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-[24px] bg-gray shadow-brand-sm">
        {mainImageUrl ? (
          <Image src={mainImageUrl} alt={name} fill className="object-cover" priority />
        ) : (
          <ImagePlaceholder label="Vista frontal" />
        )}
      </div>
      <div className="mt-3.5 grid grid-cols-2 gap-3.5">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gray">
          {frontImageUrl ? (
            <Image src={frontImageUrl} alt={`${name} — frontal`} fill className="object-cover" />
          ) : (
            <ImagePlaceholder label="Frontal" />
          )}
          <span className="absolute bottom-2 left-2 rounded-lg bg-navy/80 px-2.5 py-0.5 text-[11px] text-white">
            Frontal
          </span>
        </div>
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gray">
          {sideImageUrl ? (
            <Image src={sideImageUrl} alt={`${name} — lateral`} fill className="object-cover" />
          ) : (
            <ImagePlaceholder label="Lateral" />
          )}
          <span className="absolute bottom-2 left-2 rounded-lg bg-navy/80 px-2.5 py-0.5 text-[11px] text-white">
            Lateral
          </span>
        </div>
      </div>
    </div>
  );
}
