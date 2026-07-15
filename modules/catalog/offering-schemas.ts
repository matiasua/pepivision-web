import { z } from 'zod';
import { optionalNonEmpty } from '@/lib/zod-helpers';

// `slug` no es parte de este formulario — se deriva del `Product.slug` al
// crear y se mantiene inmutable después, mismo criterio de estabilidad de
// URL que Category/Product. `productId`/`categoryId` tampoco se editan
// después de creada la oferta (@@unique([productId, categoryId]) las fija).
export const offeringFormSchema = z.object({
  productId: z.string().trim().min(1, 'Selecciona un producto.'),
  categoryId: z.string().trim().min(1, 'Selecciona una categoría.'),
  title: optionalNonEmpty(z.string().trim().max(160)),
  commercialDescription: optionalNonEmpty(z.string().trim().max(2000)),
  // null explícito: "sin precio público, cotizar" — ver design.md → "Precios".
  priceFromClp: z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? null : value),
    z.coerce.number().int('El precio debe ser un número entero.').nonnegative('El precio no puede ser negativo.').nullable()
  ),
  active: z.boolean(),
  visible: z.boolean(),
  featured: z.boolean(),
  sortOrder: z.coerce.number().int().default(0),
  seoTitle: optionalNonEmpty(z.string().trim().max(160)),
  seoDescription: optionalNonEmpty(z.string().trim().max(300)),
});

export type OfferingFormInput = z.infer<typeof offeringFormSchema>;

export const softDeleteOfferingSchema = z.object({
  offeringId: z.string().trim().min(1),
});

export const setOfferingActiveSchema = z.object({
  offeringId: z.string().trim().min(1),
  active: z.boolean(),
});
