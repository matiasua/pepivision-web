'use server';

import { requireRole } from '@/modules/auth/service';
import { toErrorResponse } from '@/lib/errors';
import { logger } from '@/lib/logger';
import {
  categoryFormSchema,
  deleteCategorySchema,
  reorderCategoriesSchema,
  setCategoryActiveSchema,
} from '@/modules/catalog/category-schemas';
import {
  createCategory,
  deleteCategory,
  deleteCategoryImage,
  reorderCategories,
  saveCategoryImage,
  setCategoryActive,
  updateCategory,
  type RemoveCategoryResult,
} from '@/modules/catalog/category-service';
import {
  categoryAttributeFormSchema,
  deleteCategoryAttributeSchema,
} from '@/modules/catalog/category-attribute-schemas';
import { createAttribute, deleteAttribute, updateAttribute } from '@/modules/catalog/category-attribute-service';

// Todas las mutaciones de este archivo están restringidas a SUPERADMIN —
// es la "palanca de extensibilidad sin código" (design.md → "Autorización")
// y se protege server-side aquí, no solo ocultando la UI. Los Server
// Actions de ProductOffering (ADMIN y SUPERADMIN) viven en
// app/admin/products/actions.ts, no en este archivo.

type SaveActionResult = { status: 'error'; message: string } | { status: 'success'; categoryId: string };
type SimpleActionResult = { status: 'error'; message: string } | { status: 'success' };

export async function createCategoryAction(input: unknown): Promise<SaveActionResult> {
  const session = await requireRole('SUPERADMIN');
  const parsed = categoryFormSchema.safeParse(input);
  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Revisa los datos ingresados.' };
  }
  try {
    const category = await createCategory(parsed.data, session);
    return { status: 'success', categoryId: category.id };
  } catch (error) {
    logger.error('category.create_failed', { error: error instanceof Error ? error.message : String(error) });
    return { status: 'error', message: toErrorResponse(error).message };
  }
}

export async function updateCategoryAction(id: string, input: unknown): Promise<SaveActionResult> {
  const session = await requireRole('SUPERADMIN');
  const parsed = categoryFormSchema.safeParse(input);
  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Revisa los datos ingresados.' };
  }
  try {
    const category = await updateCategory(id, parsed.data, session);
    return { status: 'success', categoryId: category.id };
  } catch (error) {
    logger.error('category.update_failed', { categoryId: id, error: error instanceof Error ? error.message : String(error) });
    return { status: 'error', message: toErrorResponse(error).message };
  }
}

export type DeleteCategoryActionResult =
  | { status: 'error'; message: string }
  | { status: 'blocked'; message: string; offeringCount: number }
  | { status: 'success' };

export async function deleteCategoryAction(categoryId: string): Promise<DeleteCategoryActionResult> {
  await requireRole('SUPERADMIN');
  const parsed = deleteCategorySchema.safeParse({ categoryId });
  if (!parsed.success) {
    return { status: 'error', message: 'Datos inválidos.' };
  }
  try {
    const result: RemoveCategoryResult = await deleteCategory(parsed.data.categoryId);
    if (result.status === 'blocked') {
      const plural = result.offeringCount === 1 ? 'oferta asociada' : 'ofertas asociadas';
      return {
        status: 'blocked',
        message: `La categoría no puede eliminarse porque tiene ${result.offeringCount} ${plural}. Puedes desactivarla en su lugar.`,
        offeringCount: result.offeringCount,
      };
    }
    return { status: 'success' };
  } catch (error) {
    logger.error('category.delete_failed', { categoryId, error: error instanceof Error ? error.message : String(error) });
    return { status: 'error', message: toErrorResponse(error).message };
  }
}

export type CategoryImageActionResult =
  | { status: 'error'; message: string }
  | { status: 'success'; imagePath: string | null };

// Fase 6 (design.md → "Imágenes de categoría"): SUPERADMIN-only, misma
// palanca de "estructura de categoría" que el resto de este archivo — una
// imagen de categoría no es mercadeo rutinario de oferta, es parte de la
// estructura de la categoría. Nunca acepta `imageStorageKey`/`imagePath`
// directamente del cliente: ambos se derivan server-side en
// saveCategoryImage()/deleteCategoryImage().
export async function uploadCategoryImageAction(categoryId: string, formData: FormData): Promise<CategoryImageActionResult> {
  const session = await requireRole('SUPERADMIN');
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return { status: 'error', message: 'Selecciona un archivo de imagen.' };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const category = await saveCategoryImage(categoryId, { buffer, contentType: file.type, size: file.size }, session);
    return { status: 'success', imagePath: category.imagePath };
  } catch (error) {
    // Nunca reenvía el mensaje crudo del error: puede originarse en Sharp,
    // MinIO/S3 o Prisma y filtrar detalles internos (storage keys, info de
    // conexión) — mismo criterio que product_image.upload_action_failed.
    logger.error('category_image.upload_action_failed', {
      categoryId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { status: 'error', message: toErrorResponse(error).message };
  }
}

export async function deleteCategoryImageAction(categoryId: string): Promise<SimpleActionResult> {
  const session = await requireRole('SUPERADMIN');
  try {
    await deleteCategoryImage(categoryId, session);
    return { status: 'success' };
  } catch (error) {
    logger.error('category_image.delete_action_failed', {
      categoryId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { status: 'error', message: toErrorResponse(error).message };
  }
}

export async function setCategoryActiveAction(categoryId: string, active: boolean): Promise<SimpleActionResult> {
  const session = await requireRole('SUPERADMIN');
  const parsed = setCategoryActiveSchema.safeParse({ categoryId, active });
  if (!parsed.success) {
    return { status: 'error', message: 'Datos inválidos.' };
  }
  try {
    await setCategoryActive(parsed.data.categoryId, parsed.data.active, session);
    return { status: 'success' };
  } catch (error) {
    logger.error('category.set_active_failed', { categoryId, error: error instanceof Error ? error.message : String(error) });
    return { status: 'error', message: toErrorResponse(error).message };
  }
}

export async function reorderCategoriesAction(orderedCategoryIds: string[]): Promise<SimpleActionResult> {
  const session = await requireRole('SUPERADMIN');
  const parsed = reorderCategoriesSchema.safeParse({ orderedCategoryIds });
  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };
  }
  try {
    await reorderCategories(parsed.data.orderedCategoryIds, session);
    return { status: 'success' };
  } catch (error) {
    logger.error('category.reorder_failed', { error: error instanceof Error ? error.message : String(error) });
    return { status: 'error', message: toErrorResponse(error).message };
  }
}

export interface CategoryAttributeView {
  id: string;
  key: string;
  label: string;
  type: string;
  required: boolean;
  filterable: boolean;
  visibleInCard: boolean;
  visibleInDetail: boolean;
  sortOrder: number;
  options: string[] | null;
  active: boolean;
}

type AttributeActionResult = { status: 'error'; message: string } | { status: 'success'; attribute: CategoryAttributeView };

function toAttributeView(attribute: {
  id: string;
  key: string;
  label: string;
  type: string;
  required: boolean;
  filterable: boolean;
  visibleInCard: boolean;
  visibleInDetail: boolean;
  sortOrder: number;
  options: unknown;
  active: boolean;
}): CategoryAttributeView {
  return {
    id: attribute.id,
    key: attribute.key,
    label: attribute.label,
    type: attribute.type,
    required: attribute.required,
    filterable: attribute.filterable,
    visibleInCard: attribute.visibleInCard,
    visibleInDetail: attribute.visibleInDetail,
    sortOrder: attribute.sortOrder,
    options: Array.isArray(attribute.options) ? (attribute.options as string[]) : null,
    active: attribute.active,
  };
}

export async function createCategoryAttributeAction(input: unknown): Promise<AttributeActionResult> {
  const session = await requireRole('SUPERADMIN');
  const parsed = categoryAttributeFormSchema.safeParse(input);
  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Revisa los datos del atributo.' };
  }
  try {
    const attribute = await createAttribute(parsed.data, session);
    return { status: 'success', attribute: toAttributeView(attribute) };
  } catch (error) {
    logger.error('category_attribute.create_failed', { error: error instanceof Error ? error.message : String(error) });
    return { status: 'error', message: toErrorResponse(error).message };
  }
}

export async function updateCategoryAttributeAction(id: string, input: unknown): Promise<AttributeActionResult> {
  const session = await requireRole('SUPERADMIN');
  const parsed = categoryAttributeFormSchema.safeParse(input);
  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Revisa los datos del atributo.' };
  }
  try {
    const attribute = await updateAttribute(id, parsed.data, session);
    return { status: 'success', attribute: toAttributeView(attribute) };
  } catch (error) {
    logger.error('category_attribute.update_failed', { attributeId: id, error: error instanceof Error ? error.message : String(error) });
    return { status: 'error', message: toErrorResponse(error).message };
  }
}

export async function deleteCategoryAttributeAction(attributeId: string): Promise<SimpleActionResult> {
  const session = await requireRole('SUPERADMIN');
  const parsed = deleteCategoryAttributeSchema.safeParse({ attributeId });
  if (!parsed.success) {
    return { status: 'error', message: 'Datos inválidos.' };
  }
  try {
    await deleteAttribute(parsed.data.attributeId, session);
    return { status: 'success' };
  } catch (error) {
    logger.error('category_attribute.delete_failed', { attributeId, error: error instanceof Error ? error.message : String(error) });
    return { status: 'error', message: toErrorResponse(error).message };
  }
}
