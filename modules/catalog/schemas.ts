import { Gender, ProductMaterial, ProductShape } from '@prisma/client';
import { z } from 'zod';

export const priceBucketSchema = z.enum(['low', 'mid', 'high']);
export type PriceBucket = z.infer<typeof priceBucketSchema>;

export const catalogFiltersSchema = z.object({
  q: z.string().trim().min(1).optional(),
  gender: z.nativeEnum(Gender).optional(),
  shape: z.nativeEnum(ProductShape).optional(),
  material: z.nativeEnum(ProductMaterial).optional(),
  color: z.string().trim().min(1).optional(),
  price: priceBucketSchema.optional(),
  availableOnly: z
    .literal('1')
    .optional()
    .transform((v) => v === '1'),
});

export type CatalogFilters = z.infer<typeof catalogFiltersSchema>;

type SearchParamsInput = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Parses catalog searchParams leniently: any unknown/invalid value is dropped rather than erroring the page. */
export function parseCatalogFilters(searchParams: SearchParamsInput): CatalogFilters {
  const raw = {
    q: firstValue(searchParams.q),
    gender: firstValue(searchParams.gender),
    shape: firstValue(searchParams.shape),
    material: firstValue(searchParams.material),
    color: firstValue(searchParams.color),
    price: firstValue(searchParams.price),
    availableOnly: firstValue(searchParams.availableOnly),
  };
  const result = catalogFiltersSchema.safeParse(raw);
  return result.success ? result.data : { availableOnly: false };
}
