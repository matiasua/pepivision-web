import { describe, expect, it } from 'vitest';
import {
  MAX_PRODUCT_IMAGES,
  changeProductImageColorSchema,
  productFormSchema,
  reorderProductImagesSchema,
} from '@/modules/catalog/admin-schemas';
import { Gender, ProductMaterial, ProductShape } from '@prisma/client';

const base = {
  name: 'Aurora',
  code: 'PV-201',
  brandId: 'brand_1',
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

  it('requires a brandId', () => {
    expect(productFormSchema.safeParse({ ...base, brandId: '' }).success).toBe(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- intentionally discarded to build `withoutBrand`
    const { brandId: _brandId, ...withoutBrand } = base;
    expect(productFormSchema.safeParse(withoutBrand).success).toBe(false);
  });

  it('rejects an invalid color hex', () => {
    const result = productFormSchema.safeParse({ ...base, colors: [{ name: 'Rojo', hex: 'not-a-hex' }] });
    expect(result.success).toBe(false);
  });

  it('accepts an empty colors array', () => {
    expect(productFormSchema.safeParse({ ...base, colors: [] }).success).toBe(true);
  });

  it('accepts a color with an existing id (edit session) and one without (new color)', () => {
    const result = productFormSchema.safeParse({
      ...base,
      colors: [
        { id: 'clr_1', name: 'Fucsia', hex: '#E5127D' },
        { name: 'Verde militar', hex: '#556b2f' },
      ],
    });
    expect(result.success).toBe(true);
  });
});

describe('modules/catalog/admin-schemas — gallery operations', () => {
  it('MAX_PRODUCT_IMAGES stays at or above the 12-photo floor required by design.md', () => {
    expect(MAX_PRODUCT_IMAGES).toBeGreaterThanOrEqual(12);
  });

  it('reorderProductImagesSchema requires a non-empty list of image ids', () => {
    expect(reorderProductImagesSchema.safeParse({ orderedImageIds: ['a', 'b', 'c'] }).success).toBe(true);
    expect(reorderProductImagesSchema.safeParse({ orderedImageIds: [] }).success).toBe(false);
  });

  it('changeProductImageColorSchema requires both an imageId and a productColorId', () => {
    expect(changeProductImageColorSchema.safeParse({ imageId: 'img_1', productColorId: 'clr_1' }).success).toBe(true);
    expect(changeProductImageColorSchema.safeParse({ imageId: 'img_1', productColorId: '' }).success).toBe(false);
    expect(changeProductImageColorSchema.safeParse({ imageId: '', productColorId: 'clr_1' }).success).toBe(false);
  });
});
