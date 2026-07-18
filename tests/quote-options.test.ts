import { describe, expect, it } from 'vitest';
import {
  LENTES_OPTICOS_QUOTE_OPTIONS,
  LENTES_DE_SOL_QUOTE_OPTIONS,
  LENS_MODALITY_IDS,
  SUN_LENS_MODALITY_IDS,
  resolveCategoryQuoteOptions,
  validateQuoteOptions,
  isLensSelectionCompatible,
  validateLensSelection,
  getEffectiveOfferingLensOptions,
  type LensSelectionContext,
} from '@/modules/catalog/quote-options';

function opticalContext(overrides: Partial<LensSelectionContext['category']> = {}): LensSelectionContext {
  return {
    category: {
      id: 'cat-opticos',
      slug: 'lentes-opticos',
      active: true,
      visible: true,
      capabilities: { quoteOptions: LENTES_OPTICOS_QUOTE_OPTIONS },
      ...overrides,
    },
  };
}

function sunContext(overrides: Partial<LensSelectionContext['category']> = {}): LensSelectionContext {
  return {
    category: {
      id: 'cat-sol',
      slug: 'lentes-de-sol',
      active: true,
      visible: true,
      capabilities: { quoteOptions: LENTES_DE_SOL_QUOTE_OPTIONS },
      ...overrides,
    },
  };
}

function baseSelection(overrides: Record<string, unknown> = {}) {
  return {
    categoryId: 'cat-opticos',
    lensModality: 'monofocal',
    treatments: [],
    additionalOptions: [],
    needsPrescription: true,
    ...overrides,
  };
}

describe('modules/catalog/quote-options — matriz comercial', () => {
  it('Lentes ópticos expone exactamente su fila de la matriz', () => {
    expect(LENTES_OPTICOS_QUOTE_OPTIONS.lensTypes).toEqual(['monofocal', 'bifocal', 'progresivo']);
    expect(LENTES_OPTICOS_QUOTE_OPTIONS.treatments).toEqual([
      'antirreflejo',
      'filtro-azul-violeta',
      'fotocromatico',
      'proteccion-uv',
      'resistencia-rayaduras',
    ]);
    expect(LENTES_OPTICOS_QUOTE_OPTIONS.additionalOptions).toEqual(['alto-indice']);
  });

  it('Lentes de sol expone exactamente su fila de la matriz', () => {
    expect(LENTES_DE_SOL_QUOTE_OPTIONS.lensTypes).toEqual(['sin-graduacion', 'solar-monofocal', 'solar-progresivo']);
    expect(LENTES_DE_SOL_QUOTE_OPTIONS.treatments).toEqual(['uv400', 'resistencia-rayaduras']);
    expect(LENTES_DE_SOL_QUOTE_OPTIONS.additionalOptions).toEqual(['polarizado', 'degradado', 'espejado', 'solar-graduado']);
  });

  it('proteccion-uv y uv400 son IDs distintos — ninguno aparece en la fila de la otra categoría', () => {
    expect(LENTES_OPTICOS_QUOTE_OPTIONS.treatments).toContain('proteccion-uv');
    expect(LENTES_OPTICOS_QUOTE_OPTIONS.treatments).not.toContain('uv400');
    expect(LENTES_DE_SOL_QUOTE_OPTIONS.treatments).toContain('uv400');
    expect(LENTES_DE_SOL_QUOTE_OPTIONS.treatments).not.toContain('proteccion-uv');
  });

  it('nunca incluye Hidrofóbico y oleofóbico en ninguna categoría', () => {
    const allIds = [...LENTES_OPTICOS_QUOTE_OPTIONS.treatments, ...LENTES_DE_SOL_QUOTE_OPTIONS.treatments];
    expect(allIds).not.toContain('hidrofobico-oleofobico');
  });

  it('nunca incluye Bifocal solar ni ningún ID con "bifocal" en la modalidad solar', () => {
    expect(LENTES_DE_SOL_QUOTE_OPTIONS.lensTypes).not.toContain('bifocal');
    expect(SUN_LENS_MODALITY_IDS).not.toContain('solar-bifocal' as never);
  });

  it('nunca ofrece filtro azul-violeta ni alto índice como opción solar', () => {
    expect(LENTES_DE_SOL_QUOTE_OPTIONS.treatments).not.toContain('filtro-azul-violeta');
    expect(LENTES_DE_SOL_QUOTE_OPTIONS.additionalOptions).not.toContain('alto-indice');
  });

  it('todos los IDs de modalidad son únicos', () => {
    expect(new Set(LENS_MODALITY_IDS).size).toBe(LENS_MODALITY_IDS.length);
  });

  it('todos los IDs de tratamientos/opciones de cada categoría son únicos', () => {
    for (const options of [LENTES_OPTICOS_QUOTE_OPTIONS, LENTES_DE_SOL_QUOTE_OPTIONS]) {
      const ids = [...options.treatments, ...options.additionalOptions];
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe('modules/catalog/quote-options — resolveCategoryQuoteOptions (fail-closed)', () => {
  it('una categoría sin quoteOptions resuelve a la allowlist vacía', () => {
    expect(resolveCategoryQuoteOptions(undefined)).toEqual({ version: 1, lensTypes: [], treatments: [], additionalOptions: [] });
    expect(resolveCategoryQuoteOptions(null)).toEqual({ version: 1, lensTypes: [], treatments: [], additionalOptions: [] });
  });

  it('un quoteOptions malformado (versión desconocida) resuelve a la allowlist vacía, nunca lanza', () => {
    expect(resolveCategoryQuoteOptions({ version: 2, lensTypes: [] })).toEqual({
      version: 1,
      lensTypes: [],
      treatments: [],
      additionalOptions: [],
    });
  });

  it('un quoteOptions con un ID desconocido resuelve a la allowlist vacía, nunca lanza', () => {
    expect(resolveCategoryQuoteOptions({ version: 1, lensTypes: ['inventado'], treatments: [], additionalOptions: [] })).toEqual({
      version: 1,
      lensTypes: [],
      treatments: [],
      additionalOptions: [],
    });
  });

  it('validateQuoteOptions (escritura) rechaza en vez de resolver vacío', () => {
    expect(() => validateQuoteOptions({ version: 1, lensTypes: ['inventado'], treatments: [], additionalOptions: [] })).toThrow();
    expect(() => validateQuoteOptions({ version: 1, lensTypes: [], treatments: [], additionalOptions: [], extra: true })).toThrow();
  });
});

describe('modules/catalog/quote-options — validateLensSelection (Lentes ópticos)', () => {
  it('Monofocal óptico con receta es válido', () => {
    const result = validateLensSelection(baseSelection({ lensModality: 'monofocal' }), opticalContext());
    expect(result.ok).toBe(true);
  });

  it('Bifocal óptico con receta es válido', () => {
    const result = validateLensSelection(baseSelection({ lensModality: 'bifocal' }), opticalContext());
    expect(result.ok).toBe(true);
  });

  it('Progresivo óptico con receta es válido', () => {
    const result = validateLensSelection(baseSelection({ lensModality: 'progresivo' }), opticalContext());
    expect(result.ok).toBe(true);
  });

  it('rechaza "Multifocal" para nuevas selecciones (el ID vigente es "progresivo")', () => {
    const result = validateLensSelection(baseSelection({ lensModality: 'Multifocal' }), opticalContext());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.map((e) => e.code)).toContain('unknown_lens_modality');
  });

  it('un tratamiento fuera de la allowlist óptica es rechazado (ninguna opción solar aparece en óptico)', () => {
    const result = validateLensSelection(baseSelection({ treatments: ['polarizado'] }), opticalContext());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.map((e) => e.code)).toContain('unknown_treatment');
  });

  it('uv400 es rechazado en Lentes ópticos (no es una opción genérica)', () => {
    const result = validateLensSelection(baseSelection({ treatments: ['uv400'] }), opticalContext());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.map((e) => e.code)).toContain('unknown_treatment');
  });

  it('un ID desconocido en tratamientos es rechazado', () => {
    const result = validateLensSelection(baseSelection({ treatments: ['no-existe'] }), opticalContext());
    expect(result.ok).toBe(false);
  });

  it('una opción adicional desconocida es rechazada', () => {
    const result = validateLensSelection(baseSelection({ additionalOptions: ['no-existe'] }), opticalContext());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.map((e) => e.code)).toContain('unknown_additional_option');
  });

  it('tratamientos duplicados son rechazados', () => {
    const result = validateLensSelection(baseSelection({ treatments: ['antirreflejo', 'antirreflejo'] }), opticalContext());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.map((e) => e.code)).toContain('duplicate_treatment');
  });

  it('opciones adicionales duplicadas son rechazadas', () => {
    const result = validateLensSelection(baseSelection({ additionalOptions: ['alto-indice', 'alto-indice'] }), opticalContext());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.map((e) => e.code)).toContain('duplicate_additional_option');
  });

  it('rechaza una modalidad óptica sin receta (todas requieren graduación)', () => {
    const result = validateLensSelection(baseSelection({ lensModality: 'monofocal', needsPrescription: false }), opticalContext());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.map((e) => e.code)).toContain('prescription_required');
  });

  it('acepta antirreflejo + alto índice combinados (combinación válida)', () => {
    const result = validateLensSelection(
      baseSelection({ treatments: ['antirreflejo'], additionalOptions: ['alto-indice'] }),
      opticalContext()
    );
    expect(result.ok).toBe(true);
  });
});

describe('modules/catalog/quote-options — validateLensSelection (Lentes de sol)', () => {
  it('modalidad "sin graduación" sin receta es válida', () => {
    const result = validateLensSelection(
      baseSelection({ categoryId: 'cat-sol', lensModality: 'sin-graduacion', needsPrescription: false }),
      sunContext()
    );
    expect(result.ok).toBe(true);
  });

  it('"sin graduación" con receta solicitada es rechazada (modalidad exclusivamente sin receta)', () => {
    const result = validateLensSelection(
      baseSelection({ categoryId: 'cat-sol', lensModality: 'sin-graduacion', needsPrescription: true }),
      sunContext()
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.map((e) => e.code)).toContain('prescription_forbidden');
  });

  it('solar monofocal con receta es válido', () => {
    const result = validateLensSelection(
      baseSelection({ categoryId: 'cat-sol', lensModality: 'solar-monofocal', needsPrescription: true }),
      sunContext()
    );
    expect(result.ok).toBe(true);
  });

  it('solar progresivo con receta es válido', () => {
    const result = validateLensSelection(
      baseSelection({ categoryId: 'cat-sol', lensModality: 'solar-progresivo', needsPrescription: true }),
      sunContext()
    );
    expect(result.ok).toBe(true);
  });

  it('Bifocal solar (una modalidad óptica) es rechazado dentro de Lentes de sol', () => {
    const result = validateLensSelection(
      baseSelection({ categoryId: 'cat-sol', lensModality: 'bifocal', needsPrescription: true }),
      sunContext()
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.map((e) => e.code)).toContain('unknown_lens_modality');
  });

  it('un tratamiento exclusivamente óptico (filtro azul-violeta) es rechazado dentro de Lentes de sol', () => {
    const result = validateLensSelection(
      baseSelection({ categoryId: 'cat-sol', lensModality: 'solar-monofocal', treatments: ['filtro-azul-violeta'] }),
      sunContext()
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.map((e) => e.code)).toContain('unknown_treatment');
  });

  it('alto índice (opción exclusivamente óptica) es rechazado dentro de Lentes de sol', () => {
    const result = validateLensSelection(
      baseSelection({ categoryId: 'cat-sol', lensModality: 'solar-monofocal', additionalOptions: ['alto-indice'] }),
      sunContext()
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.map((e) => e.code)).toContain('unknown_additional_option');
  });

  it('uv400 es válido en Lentes de sol', () => {
    const result = validateLensSelection(
      baseSelection({ categoryId: 'cat-sol', lensModality: 'solar-monofocal', treatments: ['uv400'] }),
      sunContext()
    );
    expect(result.ok).toBe(true);
  });

  it('proteccion-uv (no uv400) es rechazado dentro de Lentes de sol — nunca hay alias implícito', () => {
    const result = validateLensSelection(
      baseSelection({ categoryId: 'cat-sol', lensModality: 'solar-monofocal', treatments: ['proteccion-uv'] }),
      sunContext()
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.map((e) => e.code)).toContain('unknown_treatment');
  });

  it('acepta la combinación solar-graduado + polarizado ("polarizado graduado", nunca contradictoria)', () => {
    const result = validateLensSelection(
      baseSelection({
        categoryId: 'cat-sol',
        lensModality: 'solar-progresivo',
        additionalOptions: ['solar-graduado', 'polarizado'],
      }),
      sunContext()
    );
    expect(result.ok).toBe(true);
  });
});

describe('modules/catalog/quote-options — categorías/ofertas', () => {
  it('una categoría inactiva es rechazada', () => {
    const result = validateLensSelection(baseSelection(), opticalContext({ active: false }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.map((e) => e.code)).toContain('inactive_category');
  });

  it('un slug de categoría legado es rechazado', () => {
    const result = validateLensSelection(baseSelection(), opticalContext({ slug: 'armazones' }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.map((e) => e.code)).toContain('legacy_category_slug');
  });

  it('una oferta que pertenece a otra categoría es rechazada (intersección Category + ProductOffering)', () => {
    const context: LensSelectionContext = {
      ...opticalContext(),
      offering: { id: 'off-1', categoryId: 'cat-sol', productId: 'prod-1', active: true, visible: true, deletedAt: null },
    };
    const result = validateLensSelection(baseSelection({ offeringId: 'off-1' }), context);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.map((e) => e.code)).toContain('offering_mismatch');
  });

  it('una oferta inactiva es rechazada aunque pertenezca a la categoría correcta', () => {
    const context: LensSelectionContext = {
      ...opticalContext(),
      offering: { id: 'off-1', categoryId: 'cat-opticos', productId: 'prod-1', active: false, visible: true, deletedAt: null },
    };
    const result = validateLensSelection(baseSelection({ offeringId: 'off-1' }), context);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.map((e) => e.code)).toContain('inactive_offering');
  });

  it('un producto no visible es rechazado', () => {
    const context: LensSelectionContext = {
      ...opticalContext(),
      offering: { id: 'off-1', categoryId: 'cat-opticos', productId: 'prod-1', active: true, visible: true, deletedAt: null },
      product: { id: 'prod-1', visible: false },
    };
    const result = validateLensSelection(baseSelection({ offeringId: 'off-1' }), context);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.map((e) => e.code)).toContain('inactive_product');
  });

  it('una oferta activa/visible, de un producto visible y de la categoría correcta es válida', () => {
    const context: LensSelectionContext = {
      ...opticalContext(),
      offering: { id: 'off-1', categoryId: 'cat-opticos', productId: 'prod-1', active: true, visible: true, deletedAt: null },
      product: { id: 'prod-1', visible: true },
    };
    const result = validateLensSelection(baseSelection({ offeringId: 'off-1' }), context);
    expect(result.ok).toBe(true);
  });

  it('getEffectiveOfferingLensOptions sin configuration es exactamente la de la categoría', () => {
    const options = getEffectiveOfferingLensOptions({ category: { capabilities: { quoteOptions: LENTES_OPTICOS_QUOTE_OPTIONS } } });
    expect(options).toEqual(LENTES_OPTICOS_QUOTE_OPTIONS);
  });

  it('una oferta puede restringir uv400 mediante lensOptionExclusions, sin afectar el resto', () => {
    const options = getEffectiveOfferingLensOptions({
      category: { capabilities: { quoteOptions: LENTES_DE_SOL_QUOTE_OPTIONS } },
      configuration: { version: 1, lensOptionExclusions: { treatments: ['uv400'] } },
    });
    expect(options.treatments).not.toContain('uv400');
    expect(options.treatments).toContain('resistencia-rayaduras');
    expect(options.additionalOptions).toEqual(LENTES_DE_SOL_QUOTE_OPTIONS.additionalOptions);
  });

  it('lensOptionExclusions nunca amplía la matriz de la categoría — un ID excluido que la categoría no ofrecía no tiene efecto', () => {
    const options = getEffectiveOfferingLensOptions({
      category: { capabilities: { quoteOptions: LENTES_OPTICOS_QUOTE_OPTIONS } },
      // "excluir" uv400 (que Lentes ópticos ni siquiera ofrece) no puede
      // hacer que aparezca — la exclusión es puramente sustractiva.
      configuration: { version: 1, lensOptionExclusions: { treatments: ['uv400'] } },
    });
    expect(options).toEqual(LENTES_OPTICOS_QUOTE_OPTIONS);
    expect(options.treatments).not.toContain('uv400');
  });

  it('una configuration inválida no excluye nada (fail-closed) — nunca lanza', () => {
    const options = getEffectiveOfferingLensOptions({
      category: { capabilities: { quoteOptions: LENTES_DE_SOL_QUOTE_OPTIONS } },
      configuration: { version: 999, garbage: true },
    });
    expect(options).toEqual(LENTES_DE_SOL_QUOTE_OPTIONS);
  });
});

describe('modules/catalog/quote-options — entrada malformada y errores estructurados', () => {
  it('rechaza una entrada que no cumple el shape básico (fail-closed)', () => {
    const result = validateLensSelection({ lensModality: 123 }, opticalContext());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].code).toBe('invalid_input');
      expect(result.errors[0].field).toBeTruthy();
      expect(result.errors[0].message).toBeTruthy();
    }
  });

  it('cada error trae field/code/message (errores estructurados, no strings sueltos)', () => {
    const result = validateLensSelection(baseSelection({ lensModality: 'no-existe' }), opticalContext());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      for (const error of result.errors) {
        expect(typeof error.field).toBe('string');
        expect(typeof error.code).toBe('string');
        expect(typeof error.message).toBe('string');
      }
    }
  });

  it('isLensSelectionCompatible es un atajo booleano coherente con validateLensSelection', () => {
    expect(isLensSelectionCompatible(baseSelection({ lensModality: 'monofocal' }), opticalContext())).toBe(true);
    expect(isLensSelectionCompatible(baseSelection({ lensModality: 'no-existe' }), opticalContext())).toBe(false);
  });
});
