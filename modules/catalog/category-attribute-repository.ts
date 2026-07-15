import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export function listAttributesForCategory(categoryId: string) {
  return prisma.categoryAttributeDefinition.findMany({
    where: { categoryId },
    orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
  });
}

export function findAttributeById(id: string) {
  return prisma.categoryAttributeDefinition.findUnique({ where: { id } });
}

/** Chequeo de unicidad de `key` dentro de la categoría (@@unique([categoryId, key])). */
export function findAttributeByCategoryAndKey(categoryId: string, key: string) {
  return prisma.categoryAttributeDefinition.findUnique({ where: { categoryId_key: { categoryId, key } } });
}

interface AttributeRowInput {
  key: string;
  label: string;
  type: Prisma.CategoryAttributeDefinitionCreateInput['type'];
  required: boolean;
  filterable: boolean;
  visibleInCard: boolean;
  visibleInDetail: boolean;
  sortOrder: number;
  options: Prisma.InputJsonValue | undefined;
  active: boolean;
}

export function createAttributeRow(categoryId: string, input: AttributeRowInput) {
  return prisma.categoryAttributeDefinition.create({ data: { categoryId, ...input } });
}

/** `key`/`categoryId` deliberadamente fuera de este update — una clave estable no cambia una vez creada. */
export function updateAttributeRow(id: string, input: Omit<AttributeRowInput, 'key'>) {
  return prisma.categoryAttributeDefinition.update({ where: { id }, data: input });
}

export function deleteAttributeRow(id: string) {
  return prisma.categoryAttributeDefinition.delete({ where: { id } });
}
