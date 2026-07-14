import { z } from 'zod';
import { Gender, ProductBadge, ProductMaterial, ProductShape } from '@prisma/client';
import { optionalNonEmpty } from '@/lib/zod-helpers';

const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, 'El color debe ser un valor hexadecimal (#rrggbb).');

// Operational cap on how many colors a single product can have — an admin
// mutation (addProductColorAction), not a fixed enum, so it can change
// without a migration. Also used to cap the initial array on product
// creation (see productFormSchema below).
export const MAX_PRODUCT_COLORS = 12;

export const productColorSchema = z.object({
  // Present for a color that already exists in the DB (carried through from
  // initialValues so the diff in modules/catalog/admin-service.ts can tell
  // "keep/rename this one" apart from "this is brand new") — absent for a
  // color the admin just added in this edit session.
  id: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1, 'Nombre de color requerido.').max(40),
  hex: hexColorSchema,
});

export const productFormSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio.').max(120),
  code: z.string().trim().min(1, 'El código es obligatorio.').max(40),
  brandId: z.string().trim().min(1, 'Selecciona una marca.'),
  priceFromClp: z.coerce.number().int('El precio debe ser un número entero.').positive('El precio debe ser mayor que 0.'),
  sizes: optionalNonEmpty(z.string().trim().max(60)),
  gender: z.enum(Gender, { message: 'Selecciona un público objetivo.' }),
  shape: z.enum(ProductShape, { message: 'Selecciona una forma.' }),
  material: z.enum(ProductMaterial, { message: 'Selecciona un material.' }),
  available: z.boolean(),
  visible: z.boolean(),
  badge: optionalNonEmpty(z.enum(ProductBadge)),
  description: optionalNonEmpty(z.string().trim().max(2000)),
  // Only meaningful on create — once a product exists, colors are managed
  // one at a time via addProductColorAction/removeProductColorAction (see
  // ProductForm.tsx), immediately, independent of the whole-form save.
  colors: z.array(productColorSchema).max(MAX_PRODUCT_COLORS),
});

export type ProductFormInput = z.infer<typeof productFormSchema>;

export const addProductColorSchema = z.object({
  name: z.string().trim().min(1, 'Nombre de color requerido.').max(40),
  hex: hexColorSchema,
});

export const removeProductColorSchema = z.object({
  colorId: z.string().trim().min(1),
});

export const reassignProductColorSchema = z.object({
  fromColorId: z.string().trim().min(1),
  toColorId: z.string().trim().min(1),
});

export const deleteProductSchema = z.object({
  productId: z.string().min(1),
});

// Operational cap on the gallery's length — not tied to any fixed slot
// model, just a sane ceiling to protect storage/processing. Documented in
// modules/catalog/README.md; must stay >= 12 per design.md.
export const MAX_PRODUCT_IMAGES = 20;

export const reorderProductImagesSchema = z.object({
  orderedImageIds: z.array(z.string().trim().min(1)).min(1),
});

export const changeProductImageColorSchema = z.object({
  imageId: z.string().trim().min(1),
  productColorId: z.string().trim().min(1, 'Selecciona un color.'),
});

export const setCoverImageSchema = z.object({
  imageId: z.string().trim().min(1),
});
