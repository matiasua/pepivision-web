import { z } from 'zod';
import { RequestType } from '@prisma/client';
import { OPTICAL_SLUG, DEFINITIVE_SUN_SLUG } from '@/modules/catalog/taxonomy-migration';

// Fase 11 (11.2): filtro de categoría del inbox administrativo — allowlist
// cerrada a las dos categorías canónicas reales, nunca un slug arbitrario
// del query param (mismo criterio que el resto de los filtros de este
// archivo: resolución por allowlist, no por confianza en el input crudo).
export const REQUEST_CATEGORY_FILTER_SLUGS = [OPTICAL_SLUG, DEFINITIVE_SUN_SLUG] as const;

export const requestFilterSchema = z.object({
  type: z.enum(RequestType).optional(),
  status: z.enum(['NEW', 'HANDLED']).optional(),
  category: z.enum(REQUEST_CATEGORY_FILTER_SLUGS).optional(),
  dateFrom: z.string().trim().optional(),
  dateTo: z.string().trim().optional(),
});
export type RequestFilterInput = z.infer<typeof requestFilterSchema>;

type SearchParamsInput = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseRequestFilters(searchParams: SearchParamsInput): RequestFilterInput {
  const result = requestFilterSchema.safeParse({
    type: firstValue(searchParams.type),
    status: firstValue(searchParams.status),
    category: firstValue(searchParams.category),
    dateFrom: firstValue(searchParams.dateFrom),
    dateTo: firstValue(searchParams.dateTo),
  });
  return result.success ? result.data : {};
}

export const toggleRequestStatusSchema = z.object({
  requestId: z.string().min(1),
});

export const deleteRequestSchema = z.object({
  requestId: z.string().min(1),
});
