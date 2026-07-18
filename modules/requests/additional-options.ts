// redesign-extensible-catalog-v2 (Fase 7): catálogo público de opciones
// adicionales — decisiones estructurales del cristal, distintas de un
// recubrimiento de superficie (ver treatments-content.ts). "Cristales
// solares graduados" combina corrección visual y protección solar; sus
// variantes (solar monofocal / solar progresivo / polarizado graduado) son
// contenido de referencia aquí — la compatibilidad real por categoría se
// implementa en la Fase 9 (motor de compatibilidades), no en esta.
export const ADDITIONAL_OPTIONS = [
  {
    id: 'alto-indice',
    label: 'Cristales de alto índice',
    description: 'Alternativa más delgada y estética para determinadas graduaciones.',
  },
  {
    id: 'polarizado',
    label: 'Cristales polarizados',
    description:
      'Reducen reflejos provenientes de superficies como calles, vehículos y agua. Se utilizan principalmente en lentes de sol.',
  },
  {
    id: 'degradado',
    label: 'Cristales degradados',
    description: 'Presentan un tono más oscuro en la parte superior y más claro en la inferior.',
  },
  {
    id: 'espejado',
    label: 'Cristales espejados',
    description: 'Incorporan una terminación reflectante exterior.',
  },
  {
    id: 'solar-graduado',
    label: 'Cristales solares graduados',
    description:
      'Combinan corrección visual y protección solar. Según compatibilidad, pueden fabricarse como solares monofocales, solares progresivos o polarizados graduados.',
  },
] as const;

export type AdditionalOptionId = (typeof ADDITIONAL_OPTIONS)[number]['id'];
