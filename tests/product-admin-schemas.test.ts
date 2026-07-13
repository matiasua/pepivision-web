import { describe, expect, it } from 'vitest';
import { productFormSchema } from '@/modules/catalog/admin-schemas';
import { Gender, ProductMaterial, ProductShape } from '@prisma/client';

const base = {
  name: 'Aurora',
  code: 'PV-201',
  priceFromClp: 39900,
  gender: Gender.MUJER,
  shape: ProductShape.CAT_EYE,
  material: ProductMaterial.ACETATO,
  available: true,
  visible: true,
  colors: [{ name: 'Fucsia', hex: '#E5127D' }],
};

describe('modules/catalog/admin-schemas — productFormSchema', () => {
  it('accepts a valid product', () => {
    expect(productFormSchema.safeParse(base).success).toBe(true);
  });

  it('rejects a non-positive price', () => {
    expect(productFormSchema.safeParse({ ...base, priceFromClp: 0 }).success).toBe(false);
    expect(productFormSchema.safeParse({ ...base, priceFromClp: -100 }).success).toBe(false);
  });

  it('rejects a missing name or code', () => {
    expect(productFormSchema.safeParse({ ...base, name: '' }).success).toBe(false);
    expect(productFormSchema.safeParse({ ...base, code: '' }).success).toBe(false);
  });

  it('rejects an invalid color hex', () => {
    const result = productFormSchema.safeParse({ ...base, colors: [{ name: 'Rojo', hex: 'not-a-hex' }] });
    expect(result.success).toBe(false);
  });

  it('accepts an empty colors array', () => {
    expect(productFormSchema.safeParse({ ...base, colors: [] }).success).toBe(true);
  });
});
