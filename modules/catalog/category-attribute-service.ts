import type { Prisma } from '@prisma/client';
import { ValidationError } from '@/lib/errors';
import type { CurrentSession } from '@/modules/auth/service';
import { recordAudit } from '@/modules/auth/service';
import { findCategoryById } from './category-repository';
import {
  createAttributeRow,
  deleteAttributeRow,
  findAttributeByCategoryAndKey,
  findAttributeById,
  listAttributesForCategory,
  updateAttributeRow,
} from './category-attribute-repository';
import type { CategoryAttributeFormInput } from './category-attribute-schemas';

export function listAttributes(categoryId: string) {
  return listAttributesForCategory(categoryId);
}

function toRowInput(input: CategoryAttributeFormInput) {
  return {
    label: input.label,
    type: input.type,
    required: input.required,
    filterable: input.filterable,
    visibleInCard: input.visibleInCard,
    visibleInDetail: input.visibleInDetail,
    sortOrder: input.sortOrder,
    options: input.options ?? undefined,
    active: input.active,
  };
}

// Una única acción de auditoría ('category.attributes_updated') cubre
// crear/editar/eliminar un atributo — la spec catalog-administration no
// distingue una acción por operación para esta entidad (a diferencia de
// Category/ProductOffering, que sí tienen created/updated/enabled/
// disabled propios).
async function auditAttributes(actor: CurrentSession, categoryId: string, metadata: Prisma.InputJsonValue) {
  await recordAudit({
    actorId: actor.adminUser.id,
    action: 'category.attributes_updated',
    targetType: 'Category',
    targetId: categoryId,
    metadata,
  });
}

export async function createAttribute(input: CategoryAttributeFormInput, actor: CurrentSession) {
  const category = await findCategoryById(input.categoryId);
  if (!category) {
    throw new ValidationError('La categoría ya no existe.');
  }
  const existing = await findAttributeByCategoryAndKey(input.categoryId, input.key);
  if (existing) {
    throw new ValidationError('Ya existe un atributo con esa clave en esta categoría.');
  }

  const attribute = await createAttributeRow(input.categoryId, { key: input.key, ...toRowInput(input) });
  await auditAttributes(actor, input.categoryId, { attributeId: attribute.id, key: attribute.key, op: 'created' });
  return attribute;
}

export async function updateAttribute(id: string, input: CategoryAttributeFormInput, actor: CurrentSession) {
  const existing = await findAttributeById(id);
  if (!existing) {
    throw new ValidationError('El atributo ya no existe.');
  }

  const attribute = await updateAttributeRow(id, toRowInput(input));
  await auditAttributes(actor, existing.categoryId, { attributeId: id, key: existing.key, op: 'updated' });
  return attribute;
}

export async function deleteAttribute(id: string, actor: CurrentSession) {
  const existing = await findAttributeById(id);
  if (!existing) {
    throw new ValidationError('El atributo ya no existe.');
  }

  await deleteAttributeRow(id);
  await auditAttributes(actor, existing.categoryId, { attributeId: id, key: existing.key, op: 'deleted' });
}
