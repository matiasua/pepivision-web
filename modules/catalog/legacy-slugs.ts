// redesign-extensible-catalog-v2 — corrección de taxonomía (Fase 5-bis,
// cierre técnico): mapa cerrado y estático de slugs de categoría legados,
// retirados por la migración de taxonomía, hacia su categoría definitiva
// reemplazante. Nunca se deriva de input del visitante — es un lookup
// fijo, así que no hay riesgo de open redirect. Estos dos identificadores
// quedan RESERVADOS: ningún `Product.slug` puede capturarlos vía
// `/catalogo/[slug]` — ver app/catalogo/[categorySlug]/page.tsx, que
// resuelve este mapa antes que el fallback de Product.slug legado.
const LEGACY_CATEGORY_SLUG_REDIRECTS: Record<string, string> = {
  armazones: 'lentes-opticos',
  'lentes-de-sol-opticos': 'lentes-de-sol',
};

export function resolveLegacyCategorySlug(slug: string): string | null {
  return LEGACY_CATEGORY_SLUG_REDIRECTS[slug] ?? null;
}

export function isReservedLegacyCategorySlug(slug: string): boolean {
  return slug in LEGACY_CATEGORY_SLUG_REDIRECTS;
}
