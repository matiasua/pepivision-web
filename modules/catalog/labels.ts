import type { Gender, ProductBadge, ProductMaterial, ProductShape } from '@prisma/client';

// Spanish display labels for catalog enums, matching design-reference/'s copy exactly.
export const GENDER_LABELS: Record<Gender, string> = {
  MUJER: 'Mujer',
  HOMBRE: 'Hombre',
  UNISEX: 'Unisex',
  INFANTIL: 'Infantil',
};

export const SHAPE_LABELS: Record<ProductShape, string> = {
  REDONDO: 'Redondo',
  RECTANGULAR: 'Rectangular',
  CAT_EYE: 'Cat eye',
  AVIADOR: 'Aviador',
  CUADRADO: 'Cuadrado',
};

export const MATERIAL_LABELS: Record<ProductMaterial, string> = {
  ACETATO: 'Acetato',
  METAL: 'Metal',
  MIXTO: 'Mixto',
};

export const BADGE_LABELS: Record<ProductBadge, string> = {
  NUEVO: 'Nuevo',
  MAS_VENDIDO: 'Más vendido',
};

export function formatClp(amountClp: number): string {
  return `$${amountClp.toLocaleString('es-CL')}`;
}

/**
 * CTA por categoría (5.4, design.md) para las 3 categorías conocidas al
 * momento de este cambio. Una categoría nueva (creada desde el admin, sin
 * código nuevo) usa el fallback genérico — nunca queda sin CTA ni hereda
 * por error un texto pensado para otra categoría.
 */
const CATEGORY_CTA_LABELS: Record<string, string> = {
  armazones: 'Ver armazón',
  'lentes-opticos': 'Configurar lentes',
  'lentes-de-sol-opticos': 'Configurar lentes de sol ópticos',
};
const DEFAULT_OFFERING_CTA_LABEL = 'Ver oferta';

export function offeringCtaLabel(categorySlug: string): string {
  return CATEGORY_CTA_LABELS[categorySlug] ?? DEFAULT_OFFERING_CTA_LABEL;
}
