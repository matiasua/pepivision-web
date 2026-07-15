import { z } from 'zod';
import { CategoryAttributeType } from '@prisma/client';

// `options` solo tiene sentido para SELECT/MULTI_SELECT — validado como un
// array de strings no vacíos; el formulario admin lo captura como texto
// separado por líneas y lo convierte antes de llegar aquí.
export const categoryAttributeOptionsSchema = z.array(z.string().trim().min(1)).max(30);

export const categoryAttributeFormSchema = z.object({
  categoryId: z.string().trim().min(1),
  // Clave estable de máquina — ver design.md → "key". Se normaliza a
  // minúsculas/kebab en el servicio (mismo criterio que slugify), pero se
  // valida acá el formato base para dar un mensaje de error específico.
  key: z
    .string()
    .trim()
    .min(1, 'La clave es obligatoria.')
    .max(60)
    .regex(/^[a-z0-9_-]+$/, 'La clave solo puede tener minúsculas, números, guiones y guiones bajos.'),
  label: z.string().trim().min(1, 'La etiqueta es obligatoria.').max(80),
  type: z.enum(CategoryAttributeType, { message: 'Selecciona un tipo de atributo.' }),
  required: z.boolean(),
  filterable: z.boolean(),
  visibleInCard: z.boolean(),
  visibleInDetail: z.boolean(),
  sortOrder: z.coerce.number().int().default(0),
  options: z.union([categoryAttributeOptionsSchema, z.null()]).optional(),
  active: z.boolean(),
});

export type CategoryAttributeFormInput = z.infer<typeof categoryAttributeFormSchema>;

export const deleteCategoryAttributeSchema = z.object({
  attributeId: z.string().trim().min(1),
});

export const setCategoryAttributeActiveSchema = z.object({
  attributeId: z.string().trim().min(1),
  active: z.boolean(),
});
