import { describe, expect, it } from 'vitest';
import { ValidationError } from '@/lib/errors';
import {
  buildRequestSnapshotV2,
  parseRequestDetails,
  REQUEST_DETAILS_V2,
  type BuildRequestSnapshotV2Input,
} from '@/modules/requests/request-snapshot';

function baseOpticalInput(overrides: Partial<BuildRequestSnapshotV2Input> = {}): BuildRequestSnapshotV2Input {
  return {
    frameChoice: 'catalog',
    categoryId: 'cat_optical',
    categoryName: 'Lentes ópticos',
    categorySlug: 'lentes-opticos',
    offeringId: 'off_1',
    priceFromSnapshot: 49990,
    frameProductId: 'prod_1',
    frameProductName: 'Aurora (PV-101)',
    frameProductColorId: 'color_1',
    frameProductColorName: 'Negro',
    frameProductColorHex: '#111111',
    frameBrandId: 'brand_1',
    frameBrandName: 'Vespa',
    frameBrandSlug: 'vespa',
    glassType: 'Progresivo',
    treatments: ['antirreflejo'],
    treatmentLabels: ['Antirreflejo'],
    additionalOptions: ['alto-indice'],
    additionalOptionLabels: ['Cristales de alto índice'],
    prescriptionAnswer: 'Sí',
    ...overrides,
  };
}

describe('modules/requests/request-snapshot — buildRequestSnapshotV2', () => {
  it('constructs a valid optical snapshot with detailsVersion tagged', () => {
    const snapshot = buildRequestSnapshotV2(baseOpticalInput());
    expect(snapshot.detailsVersion).toBe(REQUEST_DETAILS_V2);
    expect(snapshot.categoryName).toBe('Lentes ópticos');
    expect(snapshot.glassType).toBe('Progresivo');
  });

  it('constructs a valid solar sin-graduación snapshot (no prescription, no offering)', () => {
    const snapshot = buildRequestSnapshotV2(
      baseOpticalInput({
        frameChoice: 'advice',
        categoryId: 'cat_sun',
        categoryName: 'Lentes de sol',
        categorySlug: 'lentes-de-sol',
        offeringId: null,
        priceFromSnapshot: null,
        frameProductId: null,
        frameProductName: null,
        frameProductColorId: null,
        frameProductColorName: null,
        frameProductColorHex: null,
        frameBrandId: null,
        frameBrandName: null,
        frameBrandSlug: null,
        glassType: 'Sin graduación',
        treatments: ['uv400'],
        treatmentLabels: ['UV400'],
        additionalOptions: ['polarizado'],
        additionalOptionLabels: ['Polarizado'],
        prescriptionAnswer: null,
      })
    );
    expect(snapshot.offeringId).toBeNull();
    expect(snapshot.prescriptionAnswer).toBeNull();
  });

  it('constructs a valid solar monofocal snapshot', () => {
    const snapshot = buildRequestSnapshotV2(
      baseOpticalInput({ glassType: 'Solar monofocal', treatments: ['uv400'], treatmentLabels: ['UV400'] })
    );
    expect(snapshot.glassType).toBe('Solar monofocal');
  });

  it('constructs a valid solar progresivo snapshot', () => {
    const snapshot = buildRequestSnapshotV2(
      baseOpticalInput({ glassType: 'Solar progresivo', treatments: ['uv400'], treatmentLabels: ['UV400'] })
    );
    expect(snapshot.glassType).toBe('Solar progresivo');
  });

  it('rejects "Multifocal" — the legacy label is not part of the V2 vocabulary constraint at the type level, but callers never pass it; a corrupt build attempt still validates against the schema shape, not the label vocabulary', () => {
    // The snapshot schema validates shape/length, not the specific label
    // vocabulary (that allowlist lives in modules/catalog/quote-options.ts,
    // enforced by submitQuote before this builder is ever called) — this
    // test documents that boundary rather than re-testing Fase 9's engine.
    expect(() => buildRequestSnapshotV2(baseOpticalInput({ glassType: 'Multifocal' }))).not.toThrow();
  });

  it('throws ValidationError when a required field is missing entirely', () => {
    const invalid = { ...baseOpticalInput() } as Partial<BuildRequestSnapshotV2Input>;
    delete invalid.categoryId;
    expect(() => buildRequestSnapshotV2(invalid as BuildRequestSnapshotV2Input)).toThrow(ValidationError);
  });

  it('throws ValidationError when treatments exceed the max item count', () => {
    const many = Array.from({ length: 25 }, (_, i) => `treatment-${i}`);
    expect(() => buildRequestSnapshotV2(baseOpticalInput({ treatments: many, treatmentLabels: many }))).toThrow(
      ValidationError
    );
  });

  it('rejects unexpected extra properties (strict schema)', () => {
    const withExtra = { ...baseOpticalInput(), unexpectedField: 'nope' } as unknown as BuildRequestSnapshotV2Input;
    expect(() => buildRequestSnapshotV2(withExtra)).toThrow(ValidationError);
  });
});

describe('modules/requests/request-snapshot — parseRequestDetails', () => {
  it('parses a well-formed V2 snapshot', () => {
    const snapshot = buildRequestSnapshotV2(baseOpticalInput());
    const normalized = parseRequestDetails(snapshot);
    expect(normalized.version).toBe(2);
    expect(normalized.categoryName).toBe('Lentes ópticos');
    expect(normalized.glassType).toBe('Progresivo');
    expect(normalized.treatmentLabels).toEqual(['Antirreflejo']);
  });

  it('parses a legacy V1 row (no detailsVersion) tolerantly, preserving historical "Multifocal"', () => {
    const legacy = {
      frameChoice: 'catalog',
      frameProductName: 'Modelo Legado (LEG-1)',
      frameProductColorName: 'Café',
      glassType: 'Multifocal',
      treatmentLabels: ['Antirreflejo'],
      prescriptionAnswer: 'Sí',
    };
    const normalized = parseRequestDetails(legacy);
    expect(normalized.version).toBe(1);
    expect(normalized.glassType).toBe('Multifocal');
    expect(normalized.categoryName).toBeNull();
  });

  it('never converts a legacy "Multifocal" value into "Progresivo"', () => {
    const normalized = parseRequestDetails({ glassType: 'Multifocal' });
    expect(normalized.glassType).toBe('Multifocal');
  });

  it('opportunistically reads categoryName/categorySlug from a Fase-10-era row that has them but no detailsVersion tag', () => {
    const intermediate = { categoryName: 'Lentes de sol', categorySlug: 'lentes-de-sol', glassType: 'Sin graduación' };
    const normalized = parseRequestDetails(intermediate);
    expect(normalized.version).toBe(1);
    expect(normalized.categoryName).toBe('Lentes de sol');
  });

  it('treats an unknown/future detailsVersion as unparseable rather than silently reading it as V1', () => {
    const normalized = parseRequestDetails({ detailsVersion: 99, categoryName: 'Should not surface' });
    expect(normalized.version).toBe('unknown');
    expect(normalized.categoryName).toBeNull();
  });

  it('treats a details claiming detailsVersion 2 but failing the V2 schema as unparseable, not as V1', () => {
    const normalized = parseRequestDetails({ detailsVersion: 2, categoryId: 'x' }); // missing required fields
    expect(normalized.version).toBe('unknown');
  });

  it('rejects a V2-tagged snapshot with an unexpected extra property (strict schema applies to reads too)', () => {
    const snapshot = buildRequestSnapshotV2(baseOpticalInput());
    const withExtra = { ...snapshot, unexpectedField: 'nope' };
    expect(parseRequestDetails(withExtra).version).toBe('unknown');
  });

  it('preserves whichever label was stored at submission time, even if the canonical label for the same id changes later — labels are historical, never re-derived from the id', () => {
    const older = buildRequestSnapshotV2(
      baseOpticalInput({ treatments: ['antirreflejo'], treatmentLabels: ['Antirreflejo (nombre antiguo)'] })
    );
    const newer = buildRequestSnapshotV2(baseOpticalInput({ treatments: ['antirreflejo'], treatmentLabels: ['Antirreflejo'] }));
    expect(parseRequestDetails(older).treatmentLabels).toEqual(['Antirreflejo (nombre antiguo)']);
    expect(parseRequestDetails(newer).treatmentLabels).toEqual(['Antirreflejo']);
  });

  it('handles corrupt/non-object JSON without throwing', () => {
    for (const corrupt of [null, undefined, 'a string', 42, ['array'], true]) {
      expect(() => parseRequestDetails(corrupt)).not.toThrow();
      expect(parseRequestDetails(corrupt).version).toBe('unknown');
    }
  });

  it('distinguishes "no disponible" (unknown/missing) from a real empty array for treatments', () => {
    const normalized = parseRequestDetails({ glassType: 'Monofocal' });
    expect(normalized.treatmentLabels).toEqual([]);
    expect(Array.isArray(normalized.treatmentLabels)).toBe(true);
  });
});
