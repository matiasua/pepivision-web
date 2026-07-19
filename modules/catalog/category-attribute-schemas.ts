import { z } from 'zod';
import { CategoryAttributeType } from '@prisma/client';

// `options` solo tiene sentido para SELECT/MULTI_SELECT — validado como un
// array de strings no vacíos; el formulario admin lo captura como texto
// separado por líneas y lo convierte antes de llegar aquí.
export const categoryAttributeOptionsSchema = z.array(z.string().trim().min(1)).max(30);

// Fase 12 (cierre operativo — filtros dinámicos): TEXT/NUMBER nunca
// pueden marcarse `filterable: true`. El catálogo público no tiene (ni
// tenía sentido construir) un control de filtro para "coincidencia
// exacta de un número arbitrario" o "texto libre" — un atributo numérico
// que sí debe filtrarse ya tiene un tipo dedicado para eso: RANGE (ver
// design.md → "Fase 12 — corrección operativa"). Rechazado aquí, en el
// único punto de entrada de escritura, en vez de dejar el estado
// "filterable: true pero sin control público" posible en absoluto.
const NEVER_FILTERABLE_TYPES: CategoryAttributeType[] = [CategoryAttributeType.TEXT, CategoryAttributeType.NUMBER];

export const categoryAttributeFormSchema = z
  .object({
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
  })
  .refine((data) => !(data.filterable && NEVER_FILTERABLE_TYPES.includes(data.type)), {
    message: 'Texto y Número no pueden marcarse como filtrables — usa Rango numérico si necesitas filtrar por un valor numérico.',
    path: ['filterable'],
  });

export type CategoryAttributeFormInput = z.infer<typeof categoryAttributeFormSchema>;

export const deleteCategoryAttributeSchema = z.object({
  attributeId: z.string().trim().min(1),
});

export const setCategoryAttributeActiveSchema = z.object({
  attributeId: z.string().trim().min(1),
  active: z.boolean(),
});
