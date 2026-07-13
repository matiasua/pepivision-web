import { z } from 'zod';
import { Gender, ProductBadge, ProductMaterial, ProductShape } from '@prisma/client';
import { optionalNonEmpty } from '@/lib/zod-helpers';

const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, 'El color debe ser un valor hexadecimal (#rrggbb).');

export const productColorSchema = z.object({
  name: z.string().trim().min(1, 'Nombre de color requerido.').max(40),
  hex: hexColorSchema,
});

export const productFormSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio.').max(120),
  code: z.string().trim().min(1, 'El código es obligatorio.').max(40),
  priceFromClp: z.coerce.number().int('El precio debe ser un número entero.').positive('El precio debe ser mayor que 0.'),
  sizes: optionalNonEmpty(z.string().trim().max(60)),
  gender: z.enum(Gender, { message: 'Selecciona un público objetivo.' }),
  shape: z.enum(ProductShape, { message: 'Selecciona una forma.' }),
  material: z.enum(ProductMaterial, { message: 'Selecciona un material.' }),
  available: z.boolean(),
  visible: z.boolean(),
  badge: optionalNonEmpty(z.enum(ProductBadge)),
  description: optionalNonEmpty(z.string().trim().max(2000)),
  colors: z.array(productColorSchema).max(12),
});

export type ProductFormInput = z.infer<typeof productFormSchema>;

export const deleteProductSchema = z.object({
  productId: z.string().min(1),
});
