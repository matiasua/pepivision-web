// redesign-extensible-catalog-v2 (Fase 7): catálogo público de
// tratamientos (recubrimientos de superficie), separado deliberadamente de
// modules/requests/additional-options.ts (decisiones estructurales del
// cristal) — ver spec `lens-configuration` → "Additional options are
// modeled separately from treatments". No confundir con
// `TREATMENT_IDS` en modules/requests/schemas.ts, que es el enum técnico
// V1 ya persistido por el cotizador (sin cambios en esta fase — la fusión
// treatments+additional-options ahí es un compromiso V1 conocido,
// resuelto recién en la Fase 9, motor de compatibilidades).
//
// "Hidrofóbico y oleofóbico" fue retirado de este catálogo (iteración
// correctiva de interfaz, Fase 7) por decisión comercial del propietario
// del producto: Pepi Visión no ofrece actualmente esta alternativa. No es
// un error técnico ni un renombre — es una eliminación de contenido
// público. No afecta `Request.details` históricos (ningún dato legacy
// contenía este valor como enum técnico persistido; era solo copy de
// /cristales) ni el baseline archivado de OpenSpec.
export const TREATMENTS = [
  {
    id: 'antirreflejo',
    label: 'Antirreflejo',
    description: 'Reduce los reflejos y mejora la transparencia del cristal.',
  },
  {
    id: 'filtro-azul-violeta',
    label: 'Filtro de luz azul-violeta',
    description: 'Filtra selectivamente parte de la luz azul-violeta emitida por fuentes digitales y artificiales.',
  },
  {
    id: 'fotocromatico',
    label: 'Fotocromático',
    description: 'El cristal se oscurece con la exposición a la luz exterior y se aclara en interiores.',
  },
  {
    id: 'proteccion-uv',
    label: 'Protección UV',
    description: 'Ayuda a bloquear la radiación ultravioleta, según las especificaciones del cristal.',
  },
  {
    id: 'resistencia-rayaduras',
    // Nunca "antirrayas"/"imposible de rayar"/"protección total" — ver spec
    // lens-configuration → "Treatment copy never claims absolute scratch
    // resistance".
    label: 'Mayor resistencia a rayaduras',
    description: 'Capa endurecida que mejora la resistencia superficial y la durabilidad del cristal.',
  },
] as const;

export type TreatmentContentId = (typeof TREATMENTS)[number]['id'];
