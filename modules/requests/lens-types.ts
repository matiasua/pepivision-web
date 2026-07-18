// redesign-extensible-catalog-v2 (Fase 7, design.md → "Contenido de
// cristales, tratamientos y opciones adicionales"): catálogo fijo,
// code-known y versionado de tipos de cristal — contenido público (usado
// hoy por /cristales, server-rendered), no un sistema EAV admin-editable.
// Los identificadores (`monofocal`/`bifocal`/`progresivo`) son estables y
// nunca dependen del texto visible — ver spec `lens-configuration` →
// "Lens types, treatments, and additional options are a fixed, code-known
// catalog, not admin-extensible".
export const LENS_TYPES = ['monofocal', 'bifocal', 'progresivo'] as const;
export type LensType = (typeof LENS_TYPES)[number];

/** Nombre público singular — usado como encabezado de columna en la tabla comparativa. */
export const LENS_TYPE_LABELS: Record<LensType, string> = {
  monofocal: 'Monofocal',
  bifocal: 'Bifocal',
  progresivo: 'Progresivo',
};

/** Nombre público plural — usado como título de sección/tarjeta en /cristales. */
export const LENS_TYPE_LABELS_PLURAL: Record<LensType, string> = {
  monofocal: 'Monofocales',
  bifocal: 'Bifocales',
  progresivo: 'Progresivos',
};

/** Descripción breve aprobada — una oración, para tarjetas y resúmenes. */
export const LENS_TYPE_DESCRIPTIONS: Record<LensType, string> = {
  monofocal: 'Corrigen una sola distancia visual según las necesidades indicadas en tu receta.',
  bifocal: 'Permiten ver de lejos y de cerca mediante dos zonas diferenciadas en un mismo cristal.',
  progresivo: 'Ofrecen una transición gradual para ver de lejos, a distancia intermedia y de cerca, sin líneas visibles.',
};

/** Puntos extendidos — para el detalle de cada tipo en /cristales. */
export const LENS_TYPE_DETAILS: Record<LensType, string[]> = {
  monofocal: [
    'Pueden fabricarse para lejos, distancia intermedia, o cerca/lectura, según lo que indique tu receta — no sirven únicamente para lejos.',
  ],
  bifocal: [
    'Normalmente cubren lejos y cerca en un mismo cristal.',
    'Generalmente presentan una línea divisoria visible entre ambas zonas.',
    'No ofrecen una transición intermedia continua.',
  ],
  progresivo: [
    'Incluyen visión de lejos, distancia intermedia y visión de cerca.',
    'La transición entre distancias es gradual, sin línea divisoria visible.',
  ],
};

export interface LensComparisonRow {
  feature: string;
  values: Record<LensType, boolean>;
}

/**
 * Tabla comparativa definitiva (design.md, sección "Tabla comparativa
 * definitiva") — fuente única para /cristales; nunca duplicada a mano en
 * el componente.
 */
export const LENS_COMPARISON_TABLE: LensComparisonRow[] = [
  { feature: 'Una sola distancia de visión', values: { monofocal: true, bifocal: false, progresivo: false } },
  { feature: 'Lejos y cerca en un mismo cristal', values: { monofocal: false, bifocal: true, progresivo: true } },
  { feature: 'Visión intermedia continua', values: { monofocal: false, bifocal: false, progresivo: true } },
  { feature: 'Línea divisoria visible', values: { monofocal: false, bifocal: true, progresivo: false } },
  { feature: 'Transición gradual entre distancias', values: { monofocal: false, bifocal: false, progresivo: true } },
];

export const LENS_COMPARISON_SUMMARY =
  'Los cristales monofocales corrigen un solo campo visual. Los bifocales cubren principalmente lejos y cerca, mientras que los progresivos incorporan también la distancia intermedia.';
