'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import type { GalleryImageView } from '@/modules/catalog/service';
import { GalleryLightbox } from './GalleryLightbox';
import { ImagePlaceholder } from './ImagePlaceholder';

// `unoptimized`: next/image's built-in optimizer refuses to fetch from any
// private-network address (loopback, RFC 1918 ranges), regardless of
// `remotePatterns` — a hardcoded SSRF guard, not a bug. MinIO in this local
// environment only ever has private addresses (Docker-internal or
// host-loopback), so its images can never go through that optimizer here.
// The resize/re-encode step already happens server-side at upload time
// (lib/image-processing.ts), so this only gives up runtime srcset/format
// negotiation, not the actual optimization. A genuinely public productive
// object storage endpoint would need this removed to regain that.
export function ProductGallery({
  name,
  images,
  colors,
}: {
  name: string;
  images: GalleryImageView[];
  colors: { id: string; name: string; hex: string }[];
}) {
  const [selectedColorId, setSelectedColorId] = useState<string | null>(null);
  const [mainIndex, setMainIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Selecting a color brings its photos to the front of the gallery
  // instead of hiding the rest — matches "mostrar primero las fotografías
  // asociadas a ese color" rather than a hard filter.
  const orderedImages = useMemo(() => {
    if (!selectedColorId) return images;
    const matching = images.filter((img) => img.productColorId === selectedColorId);
    const rest = images.filter((img) => img.productColorId !== selectedColorId);
    return [...matching, ...rest];
  }, [images, selectedColorId]);

  function selectColor(colorId: string) {
    setSelectedColorId((current) => (current === colorId ? null : colorId));
    setMainIndex(0);
  }

  function colorPreviewUrl(colorId: string): string | null {
    return (
      images.find((img) => img.productColorId === colorId)?.url ??
      images.find((img) => img.isCover)?.url ??
      images[0]?.url ??
      null
    );
  }

  if (images.length === 0) {
    return (
      <div className="relative aspect-square overflow-hidden rounded-[24px] bg-gray shadow-brand-sm">
        <ImagePlaceholder label="Foto armazón" />
      </div>
    );
  }

  const main = orderedImages[mainIndex] ?? orderedImages[0];

  return (
    <div>
      <button
        type="button"
        onClick={() => setLightboxOpen(true)}
        aria-label={`Ver en grande: ${name}${main.colorName ? ` — ${main.colorName}` : ''}`}
        className="relative block aspect-square w-full overflow-hidden rounded-[24px] bg-gray shadow-brand-sm"
      >
        <Image src={main.url} alt={`${name}${main.colorName ? ` — ${main.colorName}` : ''}`} fill className="object-cover" priority unoptimized />
        {main.colorName ? (
          <span className="absolute bottom-3 left-3 rounded-lg bg-navy/80 px-2.5 py-1 text-[11.5px] text-white">
            {main.colorName}
          </span>
        ) : null}
      </button>

      {orderedImages.length > 1 ? (
        <div className="mt-3.5 flex gap-2.5 overflow-x-auto pb-1">
          {orderedImages.map((image, i) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setMainIndex(i)}
              aria-label={`Mostrar fotografía ${i + 1}${image.colorName ? `, color ${image.colorName}` : ''}`}
              aria-current={image.id === main.id}
              className={`relative aspect-square w-[72px] shrink-0 overflow-hidden rounded-xl border-2 ${
                image.id === main.id ? 'border-fucsia' : 'border-transparent opacity-70'
              }`}
            >
              <Image src={image.url} alt="" fill className="object-cover" unoptimized sizes="72px" />
            </button>
          ))}
        </div>
      ) : null}

      {colors.length > 0 ? (
        <div className="mt-3.5">
          <div className="mb-2 text-xs font-semibold text-grafito">Ver fotografías por color</div>
          <div className="flex flex-wrap gap-2">
            {colors.map((color) => {
              const preview = colorPreviewUrl(color.id);
              const active = selectedColorId === color.id;
              return (
                <button
                  key={color.id}
                  type="button"
                  onClick={() => selectColor(color.id)}
                  aria-pressed={active}
                  className={`flex items-center gap-1.5 rounded-pill border-[1.5px] py-1 pl-1 pr-3 text-xs font-semibold ${
                    active ? 'border-fucsia bg-brand-gradient-soft text-fucsia' : 'border-line text-grafito'
                  }`}
                >
                  {preview ? (
                    <span className="relative h-6 w-6 overflow-hidden rounded-full">
                      <Image src={preview} alt="" fill className="object-cover" unoptimized sizes="24px" />
                    </span>
                  ) : (
                    <span
                      className="h-6 w-6 rounded-full border border-white shadow-[0_0_0_1px_#d7dceb]"
                      style={{ backgroundColor: color.hex }}
                    />
                  )}
                  {color.name}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {lightboxOpen ? (
        <GalleryLightbox
          images={orderedImages.map((img) => ({ id: img.id, url: img.url, colorName: img.colorName }))}
          index={mainIndex}
          productName={name}
          onClose={() => setLightboxOpen(false)}
          onNavigate={setMainIndex}
        />
      ) : null}
    </div>
  );
}
