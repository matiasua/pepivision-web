import { describe, expect, it } from 'vitest';
import {
  categoryCapabilitiesSchema,
  parseCategoryCapabilities,
  validateCategoryCapabilities,
} from '@/modules/catalog/category-capabilities';

const ARMAZONES_PROFILE = {
  requiresColor: true,
  allowsLensType: false,
  allowsTreatments: false,
  allowsPrescription: false,
  allowsPrescriptionAttachment: false,
  allowsLensTint: false,
  allowsFrameSelection: true,
};

describe('modules/catalog/category-capabilities', () => {
  it('defaults an empty object to the Armazones profile', () => {
    expect(categoryCapabilitiesSchema.parse({})).toEqual(ARMAZONES_PROFILE);
  });

  it('accepts the closed Lentes ópticos profile', () => {
    const parsed = parseCategoryCapabilities({
      requiresColor: true,
      allowsLensType: true,
      allowsTreatments: true,
      allowsPrescription: true,
      allowsPrescriptionAttachment: true,
      allowsLensTint: false,
      allowsFrameSelection: true,
    });
    expect(parsed.allowsLensType).toBe(true);
    expect(parsed.allowsLensTint).toBe(false);
  });

  it('read: treats malformed JSON as capabilities-empty (fail closed), never throws', () => {
    expect(parseCategoryCapabilities({ allowsLensType: 'yes-please' })).toEqual(ARMAZONES_PROFILE);
    expect(parseCategoryCapabilities('not-an-object')).toEqual(ARMAZONES_PROFILE);
    expect(parseCategoryCapabilities(null)).toEqual(ARMAZONES_PROFILE);
    expect(parseCategoryCapabilities(undefined)).toEqual(ARMAZONES_PROFILE);
  });

  it('write: rejects malformed capabilities instead of silently persisting them', () => {
    expect(() => validateCategoryCapabilities({ allowsLensType: 'yes-please' })).toThrow();
    expect(() => validateCategoryCapabilities('not-an-object')).toThrow();
  });

  it('write: accepts a fully-specified valid payload', () => {
    expect(validateCategoryCapabilities(ARMAZONES_PROFILE)).toEqual(ARMAZONES_PROFILE);
  });
});
