'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { CloseIcon } from '@/components/icons';

export interface LightboxImage {
  id: string;
  url: string;
  colorName: string;
}

/**
 * In-page modal viewer — never a new tab, never a direct link to the
 * storage URL. Fixed positioning (no portal) is enough here since it only
 * ever needs to sit above this page's own content, not escape a scroll
 * container elsewhere in the tree.
 */
export function GalleryLightbox({
  images,
  index,
  productName,
  onClose,
  onNavigate,
}: {
  images: LightboxImage[];
  index: number;
  productName: string;
  onClose: () => void;
  onNavigate: (nextIndex: number) => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const current = images[index];
  const goPrev = () => onNavigate((index - 1 + images.length) % images.length);
  const goNext = () => onNavigate((index + 1) % images.length);

  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
      previouslyFocused.current?.focus();
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goPrev();
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        goNext();
        return;
      }
      if (event.key === 'Tab') {
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, images.length]);

  if (!current) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex flex-col bg-black/90 p-3 sm:p-6"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Fotografías de ${productName}`}
        className="relative flex h-full w-full flex-col"
      >
        <div className="flex items-center justify-between gap-3 text-white">
          <div className="min-w-0">
            <div className="truncate font-display text-[15px] font-semibold">{productName}</div>
            {current.colorName ? <div className="text-xs text-white/70">{current.colorName}</div> : null}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="text-xs text-white/70">
              {index + 1} de {images.length}
            </span>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label="Cerrar visor de fotografías"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="relative mt-3 flex flex-1 items-center justify-center overflow-hidden">
          <div className="relative h-full w-full max-w-4xl">
            <Image
              key={current.id}
              src={current.url}
              alt={`${productName}${current.colorName ? ` — ${current.colorName}` : ''}`}
              fill
              className="object-contain"
              unoptimized
              sizes="100vw"
            />
          </div>

          {images.length > 1 ? (
            <>
              <button
                type="button"
                onClick={goPrev}
                aria-label="Fotografía anterior"
                className="absolute left-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-xl text-white hover:bg-white/20 sm:left-3"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={goNext}
                aria-label="Siguiente fotografía"
                className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-xl text-white hover:bg-white/20 sm:right-3"
              >
                ›
              </button>
            </>
          ) : null}
        </div>

        {images.length > 1 ? (
          <div className="mt-3 flex justify-center gap-2 overflow-x-auto pb-1">
            {images.map((image, i) => (
              <button
                key={image.id}
                type="button"
                onClick={() => onNavigate(i)}
                aria-label={`Ver fotografía ${i + 1} de ${images.length}${image.colorName ? `, color ${image.colorName}` : ''}`}
                aria-current={i === index}
                className={`relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border-2 ${
                  i === index ? 'border-fucsia' : 'border-transparent opacity-60'
                }`}
              >
                <Image src={image.url} alt="" fill className="object-cover" unoptimized sizes="48px" />
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
