import { z } from 'zod';
import { optionalNonEmpty } from '@/lib/zod-helpers';
import { categoryCapabilitiesSchema } from './category-capabilities';

// Un único schema compartido por crear/editar, igual que productFormSchema
// — `slug` no es un campo de este formulario: se deriva de `name` al
// crear y se mantiene inmutable después (mismo criterio de estabilidad de
// URL ya aplicado a Product.slug, ver modules/catalog/admin-repository.ts
// → updateProductRow).
export const categoryFormSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio.').max(80),
  shortDescription: optionalNonEmpty(z.string().trim().max(160)),
  description: optionalNonEmpty(z.string().trim().max(2000)),
  active: z.boolean(),
  visible: z.boolean(),
  sortOrder: z.coerce.number().int().default(0),
  icon: optionalNonEmpty(z.string().trim().max(60)),
  imagePath: optionalNonEmpty(z.string().trim().max(300)),
  seoTitle: optionalNonEmpty(z.string().trim().max(160)),
  seoDescription: optionalNonEmpty(z.string().trim().max(300)),
  capabilities: categoryCapabilitiesSchema,
});

export type CategoryFormInput = z.infer<typeof categoryFormSchema>;

export const deleteCategorySchema = z.object({
  categoryId: z.string().trim().min(1),
});
