import { describe, expect, it } from 'vitest';
import { isReservedLegacyCategorySlug, resolveLegacyCategorySlug } from '@/modules/catalog/legacy-slugs';

// Cubre el cierre técnico del bloque de corrección de taxonomía de
// redesign-extensible-catalog-v2: `/catalogo/armazones` y
// `/catalogo/lentes-de-sol-opticos` (2 segmentos, sin oferta) redirigen
// permanentemente a su categoría reemplazante en vez de devolver 404 —
// ver spec catalog-navigation → "Retired category slugs redirect
// permanently to their replacement category".
describe('modules/catalog/legacy-slugs — resolveLegacyCategorySlug / isReservedLegacyCategorySlug', () => {
  it('resolves armazones to lentes-opticos', () => {
    expect(resolveLegacyCategorySlug('armazones')).toBe('lentes-opticos');
  });

  it('resolves lentes-de-sol-opticos to lentes-de-sol', () => {
    expect(resolveLegacyCategorySlug('lentes-de-sol-opticos')).toBe('lentes-de-sol');
  });

  it('returns null for a canonical, still-valid category slug', () => {
    expect(resolveLegacyCategorySlug('lentes-opticos')).toBeNull();
    expect(resolveLegacyCategorySlug('lentes-de-sol')).toBeNull();
  });

  it('returns null for a slug that never existed', () => {
    expect(resolveLegacyCategorySlug('categoria-que-no-existe-zzz')).toBeNull();
  });

  it('returns null for a slug that merely contains a legacy slug as a substring (no partial/fuzzy match)', () => {
    expect(resolveLegacyCategorySlug('armazones-2')).toBeNull();
    expect(resolveLegacyCategorySlug('mis-armazones')).toBeNull();
  });

  it('flags both retired slugs as reserved, and only those two', () => {
    expect(isReservedLegacyCategorySlug('armazones')).toBe(true);
    expect(isReservedLegacyCategorySlug('lentes-de-sol-opticos')).toBe(true);
    expect(isReservedLegacyCategorySlug('lentes-opticos')).toBe(false);
    expect(isReservedLegacyCategorySlug('cualquier-otro-slug')).toBe(false);
  });

  it('never resolves to a value derived from the input itself (closed map, no open-redirect surface)', () => {
    // Ambas salidas posibles pertenecen al conjunto cerrado de categorías
    // definitivas — nunca un eco/transformación del slug de entrada.
    const CLOSED_TARGETS = new Set(['lentes-opticos', 'lentes-de-sol']);
    for (const legacy of ['armazones', 'lentes-de-sol-opticos']) {
      const target = resolveLegacyCategorySlug(legacy);
      expect(target).not.toBeNull();
      expect(CLOSED_TARGETS.has(target as string)).toBe(true);
    }
  });
});
