import Image from 'next/image';
import type { BrandLogo } from '@/lib/brands';

/**
 * Pure CSS marquee — no carousel library. The track renders the logo list
 * twice back to back and animates translateX(0) -> translateX(-50%), so
 * the loop point is invisible (see the `marquee` keyframe in
 * globals.css). Pause-on-hover/focus and the reduced-motion fallback are
 * plain Tailwind variants (`group-hover`, `group-focus-within`,
 * `motion-reduce`), so this never needs to be a Client Component.
 */
export function BrandCarousel({ logos }: { logos: BrandLogo[] }) {
  if (logos.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Marcas que trabajamos"
      className="group relative overflow-hidden motion-reduce:overflow-visible"
    >
      {/* Soft edge fade so logos don't appear to clip abruptly. */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-white to-transparent sm:w-16" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-white to-transparent sm:w-16" />

      <div
        className="flex w-max items-center gap-10 animate-[marquee_36s_linear_infinite] group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused] motion-reduce:w-auto motion-reduce:flex-wrap motion-reduce:animate-none motion-reduce:justify-center motion-reduce:gap-8"
      >
        {logos.map((logo) => (
          <div key={logo.src} className="relative h-14 w-28 shrink-0 sm:h-20 sm:w-40">
            <Image src={logo.src} alt={logo.alt} fill sizes="160px" className="object-contain" />
          </div>
        ))}
        {/* Duplicate for the seamless loop — hidden from assistive tech
            (nothing new to announce) and dropped entirely under reduced
            motion, so screen reader/no-animation users only ever see each
            brand once. */}
        <div aria-hidden="true" className="flex items-center gap-10 motion-reduce:hidden">
          {logos.map((logo) => (
            <div key={`${logo.src}-dup`} className="relative h-14 w-28 shrink-0 sm:h-20 sm:w-40">
              <Image src={logo.src} alt="" fill sizes="160px" className="object-contain" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
