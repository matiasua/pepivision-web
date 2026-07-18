// Inline SVG icons reused across multiple components, transcribed
// pixel-for-pixel from design-reference/. Icons used only once live
// inline in their own page/component instead of here.
export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm5.8 14.14c-.25.69-1.44 1.32-1.98 1.36-.53.05-1.03.24-3.48-.72-2.94-1.16-4.83-4.15-4.98-4.35-.15-.2-1.2-1.6-1.2-3.05 0-1.45.76-2.16 1.03-2.46.27-.3.59-.37.79-.37h.57c.18 0 .43-.07.67.51.25.6.84 2.05.91 2.2.07.15.12.32.02.52-.1.2-.15.32-.3.5-.15.17-.31.39-.44.52-.15.15-.3.31-.13.6.17.3.76 1.25 1.63 2.02 1.12.99 2.06 1.3 2.36 1.45.3.15.47.12.64-.07.17-.2.74-.86.94-1.16.2-.3.4-.25.66-.15.27.1 1.71.81 2 .96.3.15.5.22.57.35.07.12.07.72-.18 1.41Z" />
    </svg>
  );
}

export function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      aria-hidden="true"
    >
      <rect x="2" y="2" width="20" height="20" rx="5.5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function MenuIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function InfoIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  );
}

// --- /cristales (Fase 7, iteración correctiva de interfaz) ---
// Glifos geométricos simples, no ilustraciones — misma convención que el
// resto de este archivo (viewBox 24x24, stroke=currentColor). La
// iconografía final/ilustrada pertenece a improve-visual-identity-and-content;
// esto es deliberadamente esquemático.

/** Monofocal: un único punto de enfoque dentro del cristal. */
export function LensMonofocalIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <circle cx="12" cy="12" r="8.4" />
      <circle cx="12" cy="12" r="2.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Bifocal: dos zonas de visión diferenciadas por una línea horizontal (segmento inferior, como el corte real). */
export function LensBifocalIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <circle cx="12" cy="12" r="8.4" />
      <path d="M4.8 15.2h14.4" strokeWidth={2.1} />
    </svg>
  );
}

/**
 * Progresivo: tres bandas horizontales de ancho decreciente (lejos,
 * intermedia, cerca), sin línea divisoria — sugiere transición gradual
 * en vez de zonas discretas.
 */
export function LensProgresivoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <circle cx="12" cy="12" r="8.4" />
      <path d="M7 9.4h10" strokeLinecap="round" opacity={1} />
      <path d="M7.8 12h8.4" strokeLinecap="round" opacity={0.65} />
      <path d="M8.6 14.6h6.8" strokeLinecap="round" opacity={0.35} />
    </svg>
  );
}

/** Antirreflejo: cristal con el reflejo diagonal atenuado (tachado). */
export function TreatmentAntiGlareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="8.4" />
      <path d="M8.5 8.5l3 3" opacity={0.55} />
      <path d="M6.5 6.5l11 11" />
    </svg>
  );
}

/** Filtro de luz azul-violeta: pantalla emitiendo ondas de luz filtradas. */
export function TreatmentBlueLightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
      <rect x="3.2" y="5.5" width="13" height="9.4" rx="1.6" />
      <path d="M7.5 19h4.5" />
      <path d="M17.5 8.5c1.4.5 2.4 1.7 2.7 3.2M17.5 11.6c.7.3 1.2.9 1.4 1.7" opacity={0.85} />
    </svg>
  );
}

/** Fotocromático: transición sol/interior (medio sol, medio nube/sombra). */
export function TreatmentPhotochromicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="8.4" />
      <path d="M12 3.6v2.2M12 18.2v2.2M20.4 12h-2.2M5.8 12H3.6M17.9 6.1l-1.5 1.5M7.6 16.4l-1.5 1.5" opacity={0.7} />
      <path d="M12 3.6a8.4 8.4 0 0 0 0 16.8" fill="currentColor" stroke="none" opacity={0.18} />
    </svg>
  );
}

/** Protección UV: sol con un arco protector. */
export function TreatmentUVIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="13.2" r="4.4" />
      <path d="M12 5.2v1.6M6.2 7.4l1.2 1.2M17.8 7.4l-1.2 1.2" />
      <path d="M4.2 13.2a7.8 7.8 0 0 1 15.6 0" opacity={0.6} />
    </svg>
  );
}

/** Mayor resistencia a rayaduras: escudo con marca de verificación. */
export function TreatmentScratchResistantIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3.4 19 6v5.3c0 4.4-2.9 7.4-7 8.3-4.1-.9-7-3.9-7-8.3V6l7-2.6Z" />
      <path d="M9 12.2l2.1 2.1L15.2 10" />
    </svg>
  );
}

/** Alto índice: cristal más delgado, representado por capas finas apiladas. */
export function OptionHighIndexIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
      <ellipse cx="12" cy="7.6" rx="7.4" ry="2.3" />
      <path d="M4.6 7.6V12c0 1.3 3.3 2.3 7.4 2.3s7.4-1 7.4-2.3V7.6" />
      <path d="M4.6 12v4.4c0 1.3 3.3 2.3 7.4 2.3s7.4-1 7.4-2.3V12" opacity={0.6} />
    </svg>
  );
}

/** Polarizado: filtra el resplandor horizontal de superficies (calle, agua). */
export function SunPolarizedIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
      <path d="M3.4 8.6h17.2M3.4 12h17.2M3.4 15.4h17.2" opacity={0.55} />
      <rect x="7" y="4.2" width="10" height="15.6" rx="2.4" />
    </svg>
  );
}

/** Degradado: tono más oscuro arriba, más claro abajo. */
export function SunGradientIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <circle cx="12" cy="12" r="8.4" />
      <path d="M4.3 9.4a8.4 8.4 0 0 1 15.4 0Z" fill="currentColor" stroke="none" opacity={0.75} />
      <path d="M4.3 9.4h15.4" opacity={0.4} />
    </svg>
  );
}

/** Espejado: terminación reflectante exterior (brillo especular). */
export function SunMirroredIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="8.4" />
      <path d="M8.1 7.6c-1.6 1.3-2.6 3-2.9 4.9" opacity={0.9} />
      <path d="M9.6 6.3a8.3 8.3 0 0 0-1 .5" opacity={0.6} />
    </svg>
  );
}

/** Solares graduados: sol + cristal graduado combinados. */
export function SunGraduatedIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
      <circle cx="9.4" cy="9.4" r="3.6" />
      <path d="M9.4 3.4v1.4M9.4 13.4v1.4M15.4 9.4H14M4.8 9.4H3.4M13.7 5.1l-1 1M6.1 12.7l-1 1" opacity={0.7} />
      <circle cx="15.4" cy="15.4" r="4.6" />
      <path d="M12.5 18.3a4.6 4.6 0 0 1 0-5.8" opacity={0.5} />
    </svg>
  );
}

/** Recurso decorativo del hero de /cristales — lentes superpuestos, sutil. */
export function GlassesHeroIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 80" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <circle cx="38" cy="40" r="30" opacity={0.9} />
      <circle cx="82" cy="40" r="30" opacity={0.55} />
      <path d="M68 40h-16" opacity={0.9} />
      <path d="M8 34 2 30" opacity={0.6} />
      <path d="M112 34l6-4" opacity={0.4} />
    </svg>
  );
}
