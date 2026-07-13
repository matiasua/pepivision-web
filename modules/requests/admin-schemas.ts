import { z } from 'zod';
import { RequestType } from '@prisma/client';

export const requestFilterSchema = z.object({
  type: z.enum(RequestType).optional(),
  status: z.enum(['NEW', 'HANDLED']).optional(),
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
