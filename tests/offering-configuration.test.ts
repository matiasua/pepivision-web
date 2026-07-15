import { describe, expect, it } from 'vitest';
import { parseOfferingConfiguration, validateOfferingConfiguration } from '@/modules/catalog/offering-configuration';

describe('modules/catalog/offering-configuration', () => {
  it('accepts a note-only v1 payload', () => {
    const value = { version: 1, internalMerchandisingNote: 'Incluye paño de limpieza premium' };
    expect(validateOfferingConfiguration(value)).toEqual(value);
  });

  it('accepts a priceComponents-only v1 payload', () => {
    const value = {
      version: 1,
      priceComponents: [
        { label: 'Armazón', amountClp: 19990 },
        { label: 'Cristales ópticos', amountClp: 20000 },
      ],
    };
    expect(validateOfferingConfiguration(value)).toEqual(value);
  });

  it('accepts a bare version with nothing else set', () => {
    expect(validateOfferingConfiguration({ version: 1 })).toEqual({ version: 1 });
  });

  it('rejects a field that belongs to CategoryAttributeDefinition/ProductOfferingAttributeValue instead', () => {
    expect(() => validateOfferingConfiguration({ featured_color: 'azul' })).toThrow();
    expect(() => validateOfferingConfiguration({ version: 1, featured_color: 'azul' })).toThrow();
  });

  it('rejects an unrecognized configuration version — never persisted "as-is"', () => {
    expect(() => validateOfferingConfiguration({ version: 2, algo: 'nuevo' })).toThrow();
  });

  it('rejects a value that duplicates the stable priceFromClp column', () => {
    expect(() => validateOfferingConfiguration({ priceFromClp: 19990 })).toThrow();
    expect(() => validateOfferingConfiguration({ version: 1, priceFromClp: 19990 })).toThrow();
  });

  it('rejects a non-object value', () => {
    expect(() => validateOfferingConfiguration('not-an-object')).toThrow();
    expect(() => validateOfferingConfiguration(['array', 'not', 'object'])).toThrow();
  });

  it('read: null/undefined/malformed configuration parses to null (fail closed), never throws', () => {
    expect(parseOfferingConfiguration(null)).toBeNull();
    expect(parseOfferingConfiguration(undefined)).toBeNull();
    expect(parseOfferingConfiguration({ version: 2, algo: 'nuevo' })).toBeNull();
    expect(parseOfferingConfiguration('not-an-object')).toBeNull();
  });

  it('read: a valid stored configuration parses through', () => {
    expect(parseOfferingConfiguration({ version: 1, internalMerchandisingNote: 'nota' })).toEqual({
      version: 1,
      internalMerchandisingNote: 'nota',
    });
  });
});
