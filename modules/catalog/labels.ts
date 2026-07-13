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
