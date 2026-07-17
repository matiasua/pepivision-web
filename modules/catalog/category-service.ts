import { ValidationError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { slugify } from '@/lib/slug';
import { processCategoryImage } from '@/lib/image-processing';
import { imageFileMetaSchema } from '@/modules/storage/schemas';
import { buildCategoryStorageKey, buildPublicUrl, deleteObject, uploadObject } from '@/modules/storage/service';
import type { CurrentSession } from '@/modules/auth/service';
import { recordAudit } from '@/modules/auth/service';
import { validateCategoryCapabilities } from './category-capabilities';
import {
  countCategoryOfferings,
  createCategoryRow,
  deleteCategoryRow,
  findCategoryById,
  findCategoryBySlugAny,
  listActiveCategoriesForAdmin,
  listActiveVisibleCategories,
  listCategoriesForAdmin,
  reorderCategoryRows,
  runInTransaction,
  setCategoryActiveRow,
  updateCategoryImageFields,
  updateCategoryRow,
} from './category-repository';
import type { CategoryFormInput } from './category-schemas';

export function listCategories() {
  return listCategoriesForAdmin();
}

export function listActiveCategories() {
  return listActiveVisibleCategories();
}

/** Para el selector de "Disponibilidad en el catálogo" del formulario admin de producto — ver category-repository.ts. */
export function listCategoriesForOfferingSelector() {
  return listActiveCategoriesForAdmin();
}

export function getCategory(id: string) {
  return findCategoryById(id);
}

async function uniqueCategorySlugFor(name: string): Promise<string> {
  const base = slugify(name);
  let candidate = base;
  let suffix = 2;
  while (await findCategoryBySlugAny(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

function toRowInput(input: CategoryFormInput) {
  return {
    name: input.name,
    shortDescription: input.shortDescription ?? null,
    description: input.description ?? null,
    active: input.active,
    visible: input.visible,
    sortOrder: input.sortOrder,
    icon: input.icon ?? null,
    seoTitle: input.seoTitle ?? null,
    seoDescription: input.seoDescription ?? null,
    capabilities: validateCategoryCapabilities(input.capabilities),
  };
}

export async function createCategory(input: CategoryFormInput, actor: CurrentSession) {
  const slug = await uniqueCategorySlugFor(input.name);
  const category = await createCategoryRow({ ...toRowInput(input), slug });

  await recordAudit({
    actorId: actor.adminUser.id,
    action: 'category.created',
    targetType: 'Category',
    targetId: category.id,
    metadata: { slug: category.slug, name: category.name },
  });

  return category;
}

export async function updateCategory(id: string, input: CategoryFormInput, actor: CurrentSession) {
  const existing = await findCategoryById(id);
  if (!existing) {
    throw new ValidationError('La categoría que intentas editar ya no existe.');
  }
  const category = await updateCategoryRow(id, toRowInput(input));

  await recordAudit({
    actorId: actor.adminUser.id,
    action: 'category.updated',
    targetType: 'Category',
    targetId: id,
    metadata: { slug: existing.slug, name: category.name },
  });

  return category;
}

/**
 * Acción rápida de "activar/desactivar" (task 4.1), independiente del
 * guardado completo del formulario — emite `category.enabled`/
 * `category.disabled` (nombres de auditoría exigidos por la spec
 * catalog-administration), a diferencia de `updateCategory`, que siempre
 * registra `category.updated` aunque el formulario también incluya el
 * campo `active`.
 */
export async function setCategoryActive(id: string, active: boolean, actor: CurrentSession) {
  const existing = await findCategoryById(id);
  if (!existing) {
    throw new ValidationError('La categoría ya no existe.');
  }
  const category = await setCategoryActiveRow(id, active);

  await recordAudit({
    actorId: actor.adminUser.id,
    action: active ? 'category.enabled' : 'category.disabled',
    targetType: 'Category',
    targetId: id,
    metadata: { slug: existing.slug, name: existing.name },
  });

  return category;
}

export async function reorderCategories(orderedCategoryIds: string[], actor: CurrentSession) {
  const current = await listCategoriesForAdmin();
  const currentIds = new Set(current.map((c) => c.id));
  const providedIds = new Set(orderedCategoryIds);

  const sameSet = currentIds.size === providedIds.size && [...currentIds].every((id) => providedIds.has(id));
  if (!sameSet) {
    throw new ValidationError('El orden enviado no coincide con las categorías actuales.');
  }

  await runInTransaction((tx) => reorderCategoryRows(tx, orderedCategoryIds));

  // Afecta a varias filas a la vez — sin un targetId único, a diferencia
  // del resto de las mutaciones de categoría. La spec catalog-administration
  // no define una acción de auditoría dedicada para "reordenar"; se reusa
  // `category.updated` (semánticamente correcto: cambia sortOrder) en vez
  // de inventar un nombre de acción no contemplado por la spec.
  await recordAudit({
    actorId: actor.adminUser.id,
    action: 'category.updated',
    targetType: 'Category',
    targetId: null,
    metadata: { reordered: true, order: orderedCategoryIds },
  });
}

// Borrado físico autorizado explícitamente cuando offeringCount === 0 — no
// es una conveniencia técnica: la spec (catalog-categories → "Categories
// with offerings cannot be silently deleted") condiciona el bloqueo a "una
// categoría CON ofertas asociadas"; design.md → "Administración" describe
// el mismo `{status:'blocked', offeringCount}` mirroring
// removeProductColor(), que también borra físicamente cuando su condición
// de bloqueo (fotos asociadas) no aplica. "Preferir desactivación" es la
// recomendación de UX de la futura pantalla admin (Fase 4), no una
// restricción que prohíba el borrado sin ofertas.
//
// Sin `actor`/auditoría deliberadamente: la spec catalog-administration
// (lista cerrada de acciones auditadas, "Category and offering mutations
// are audit-logged") no incluye una acción de eliminación de categoría —
// solo created/updated/enabled/disabled/attributes_updated — así que no se
// inventa un nombre de acción no contemplado.
export type RemoveCategoryResult = { status: 'removed' } | { status: 'blocked'; offeringCount: number };

export async function deleteCategory(id: string): Promise<RemoveCategoryResult> {
  const existing = await findCategoryById(id);
  if (!existing) {
    throw new ValidationError('La categoría ya no existe.');
  }

  const offeringCount = await countCategoryOfferings(id);
  if (offeringCount > 0) {
    return { status: 'blocked', offeringCount };
  }

  await deleteCategoryRow(id);
  return { status: 'removed' };
}

/**
 * Sube o reemplaza la imagen de portada de una categoría (Fase 6, design.md
 * → "Imágenes de categoría"). Una única función cubre ambos casos — la
 * única diferencia real es si queda un objeto anterior que limpiar al
 * final — evitando duplicar el pipeline de procesamiento/subida/persistencia.
 *
 * Orden seguro (sección 9): procesar → subir el objeto NUEVO → persistir en
 * Postgres → solo entonces borrar el objeto anterior (best-effort, nunca
 * bloquea la respuesta ni revierte la categoría a una URL rota). Si la
 * persistencia en BD falla, el objeto nuevo recién subido se compensa
 * (borra) y el error nunca deja una categoría con una referencia inválida.
 */
export async function saveCategoryImage(
  categoryId: string,
  file: { buffer: Buffer; contentType: string; size: number },
  actor: CurrentSession
) {
  const category = await findCategoryById(categoryId);
  if (!category) {
    throw new ValidationError('La categoría ya no existe.');
  }

  const meta = imageFileMetaSchema.safeParse({ type: file.contentType, size: file.size });
  if (!meta.success) {
    throw new ValidationError(meta.error.issues[0]?.message ?? 'Archivo inválido.');
  }

  let processed;
  try {
    processed = await processCategoryImage(file.buffer);
  } catch (error) {
    logger.error('category_image.process_failed', {
      categoryId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new ValidationError('No se pudo procesar la imagen. Verifica que el archivo no esté dañado.');
  }

  const storageKey = buildCategoryStorageKey(categoryId, processed.extension);
  try {
    await uploadObject({ key: storageKey, body: processed.buffer, contentType: processed.contentType });
  } catch (error) {
    logger.error('category_image.upload_failed', { categoryId, error: error instanceof Error ? error.message : String(error) });
    throw new ValidationError('No se pudo subir la imagen al almacenamiento. Intenta nuevamente.');
  }

  const url = buildPublicUrl(storageKey);
  const previousStorageKey = category.imageStorageKey;

  let updated;
  try {
    updated = await updateCategoryImageFields(categoryId, { imagePath: url, imageStorageKey: storageKey });
  } catch (error) {
    await deleteObject(storageKey).catch((cleanupError) => {
      logger.error('category_image.orphan_cleanup_failed', {
        categoryId,
        storageKey,
        error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
      });
    });
    logger.error('category_image.persist_failed', { categoryId, error: error instanceof Error ? error.message : String(error) });
    throw new ValidationError('No se pudo guardar la imagen. Intenta nuevamente.');
  }

  if (previousStorageKey) {
    await deleteObject(previousStorageKey).catch((error) => {
      logger.error('category_image.old_object_cleanup_failed', {
        categoryId,
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }

  await recordAudit({
    actorId: actor.adminUser.id,
    action: 'category.updated',
    targetType: 'Category',
    targetId: categoryId,
    metadata: {
      slug: category.slug,
      name: category.name,
      imageAction: previousStorageKey ? 'replaced' : 'uploaded',
      mimeType: processed.contentType,
      width: processed.width,
      height: processed.height,
    },
  });

  return updated;
}

/**
 * Elimina la imagen de portada de una categoría. Idempotente: si no hay
 * imagen, no hace nada y devuelve la categoría sin cambios — nunca falla
 * por "no hay nada que borrar". Orden: la fila (referencia autoritativa) se
 * limpia primero; si el borrado del objeto en MinIO falla después, el peor
 * resultado es un objeto huérfano (registrado en el log), nunca una
 * categoría apuntando a un archivo inexistente — mismo criterio que
 * `deleteProductImage`.
 */
export async function deleteCategoryImage(categoryId: string, actor: CurrentSession) {
  const category = await findCategoryById(categoryId);
  if (!category) {
    throw new ValidationError('La categoría ya no existe.');
  }

  if (!category.imageStorageKey) {
    return category;
  }

  const storageKey = category.imageStorageKey;
  const updated = await updateCategoryImageFields(categoryId, { imagePath: null, imageStorageKey: null });

  await deleteObject(storageKey).catch((error) => {
    logger.error('category_image.delete_object_failed', {
      categoryId,
      error: error instanceof Error ? error.message : String(error),
    });
  });

  await recordAudit({
    actorId: actor.adminUser.id,
    action: 'category.updated',
    targetType: 'Category',
    targetId: categoryId,
    metadata: { slug: category.slug, name: category.name, imageAction: 'removed' },
  });

  return updated;
}
