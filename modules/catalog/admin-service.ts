import { ValidationError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { slugify } from '@/lib/slug';
import { processProductImage } from '@/lib/image-processing';
import type { CurrentSession } from '@/modules/auth/service';
import { recordAudit } from '@/modules/auth/service';
import { imageFileMetaSchema } from '@/modules/storage/schemas';
import { buildPublicUrl, buildStorageKey, deleteObject, uploadObject } from '@/modules/storage/service';
import { MAX_PRODUCT_COLORS, MAX_PRODUCT_IMAGES } from './admin-schemas';
import {
  countProductImages,
  countProductImagesByColorId,
  createProductColorRow,
  createProductImageRow,
  createProductRow,
  deleteProductColorRow,
  deleteProductImageRow,
  deleteProductRow,
  findBrandById,
  findProductByCode,
  findProductById,
  findProductBySlugAny,
  findProductColorById,
  findProductImageById,
  getMaxSortOrder,
  getProductKpis,
  listActiveBrandsForAdmin,
  listProductImages,
  listProductsForAdmin,
  reassignAndDeleteColor,
  reorderProductImagesRows,
  runInTransaction,
  setCoverImageRows,
  updateProductImageRow,
  updateProductRow,
} from './admin-repository';
import type { ProductFormInput } from './admin-schemas';

async function assertActiveBrand(brandId: string) {
  const brand = await findBrandById(brandId);
  if (!brand || !brand.active) {
    throw new ValidationError('Selecciona una marca válida.');
  }
  return brand;
}

export function listProducts(search?: string) {
  return listProductsForAdmin(search);
}

export async function listActiveBrands() {
  const brands = await listActiveBrandsForAdmin();
  return brands.map((b) => ({ id: b.id, name: b.name, logoPath: b.logoPath }));
}

export function getKpis() {
  return getProductKpis();
}

export function getProduct(id: string) {
  return findProductById(id);
}

async function uniqueSlugFor(name: string): Promise<string> {
  const base = slugify(name);
  let candidate = base;
  let suffix = 2;
  while (await findProductBySlugAny(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

export async function createProduct(input: ProductFormInput, actor: CurrentSession) {
  const existingCode = await findProductByCode(input.code);
  if (existingCode) {
    throw new ValidationError('Ya existe un modelo con ese código.');
  }
  await assertActiveBrand(input.brandId);

  const slug = await uniqueSlugFor(input.name);
  const product = await createProductRow({
    name: input.name,
    code: input.code,
    slug,
    brandId: input.brandId,
    priceFromClp: input.priceFromClp,
    sizes: input.sizes ?? null,
    gender: input.gender,
    shape: input.shape,
    material: input.material,
    available: input.available,
    visible: input.visible,
    badge: input.badge ?? null,
    description: input.description ?? null,
    colors: input.colors,
    actorId: actor.adminUser.id,
  });

  await recordAudit({
    actorId: actor.adminUser.id,
    action: 'product.created',
    targetType: 'Product',
    targetId: product.id,
    metadata: { code: product.code, name: product.name },
  });

  return product;
}

export async function updateProduct(id: string, input: ProductFormInput, actor: CurrentSession) {
  const existing = await findProductById(id);
  if (!existing) {
    throw new ValidationError('El modelo que intentas editar ya no existe.');
  }
  if (existing.code !== input.code) {
    const codeOwner = await findProductByCode(input.code);
    if (codeOwner && codeOwner.id !== id) {
      throw new ValidationError('Ya existe otro modelo con ese código.');
    }
  }
  await assertActiveBrand(input.brandId);

  // Colors are no longer touched here at all — they're mutated
  // immediately/independently via addProductColor()/removeProductColor()
  // (see ProductForm.tsx, which calls those the moment the admin adds or
  // removes a color, not on the whole-form save).
  const product = await updateProductRow(id, {
    name: input.name,
    code: input.code,
    brandId: input.brandId,
    priceFromClp: input.priceFromClp,
    sizes: input.sizes ?? null,
    gender: input.gender,
    shape: input.shape,
    material: input.material,
    available: input.available,
    visible: input.visible,
    badge: input.badge ?? null,
    description: input.description ?? null,
    actorId: actor.adminUser.id,
  });

  await recordAudit({
    actorId: actor.adminUser.id,
    action: 'product.updated',
    targetType: 'Product',
    targetId: id,
    metadata: { code: product.code, name: product.name },
  });

  return product;
}

export async function addProductColor(productId: string, input: { name: string; hex: string }, actor: CurrentSession) {
  const product = await findProductById(productId);
  if (!product) {
    throw new ValidationError('El modelo ya no existe.');
  }
  if (product.colors.length >= MAX_PRODUCT_COLORS) {
    throw new ValidationError(`Este producto ya tiene el máximo de ${MAX_PRODUCT_COLORS} colores permitidos.`);
  }

  const color = await createProductColorRow({ productId, name: input.name, hex: input.hex });

  await recordAudit({
    actorId: actor.adminUser.id,
    action: 'product.color_added',
    targetType: 'Product',
    targetId: productId,
    metadata: { colorId: color.id, name: color.name },
  });

  return color;
}

export type RemoveColorResult = { status: 'removed' } | { status: 'blocked'; photoCount: number };

export async function removeProductColor(productId: string, colorId: string, actor: CurrentSession): Promise<RemoveColorResult> {
  const color = await findProductColorById(colorId);
  if (!color || color.productId !== productId) {
    throw new ValidationError('El color no pertenece a este producto.');
  }

  const photoCount = await countProductImagesByColorId(colorId);
  if (photoCount > 0) {
    return { status: 'blocked', photoCount };
  }

  await deleteProductColorRow(colorId);

  await recordAudit({
    actorId: actor.adminUser.id,
    action: 'product.color_removed',
    targetType: 'Product',
    targetId: productId,
    metadata: { colorId, name: color.name },
  });

  return { status: 'removed' };
}

/** The recommended path when a color has photos: move them all to another of the product's colors, then delete the now-empty one — one transaction. */
export async function reassignAndRemoveProductColor(
  productId: string,
  fromColorId: string,
  toColorId: string,
  actor: CurrentSession
) {
  if (fromColorId === toColorId) {
    throw new ValidationError('Elige un color de destino distinto.');
  }
  const fromColor = await findProductColorById(fromColorId);
  if (!fromColor || fromColor.productId !== productId) {
    throw new ValidationError('El color a eliminar no pertenece a este producto.');
  }
  const toColor = await findProductColorById(toColorId);
  if (!toColor || toColor.productId !== productId) {
    throw new ValidationError('El color de destino no pertenece a este producto.');
  }

  const movedCount = await countProductImagesByColorId(fromColorId);
  await reassignAndDeleteColor(productId, fromColorId, toColorId);

  await recordAudit({
    actorId: actor.adminUser.id,
    action: 'product.color_reassigned_and_removed',
    targetType: 'Product',
    targetId: productId,
    metadata: { fromColorId, toColorId, movedCount },
  });

  return { movedCount };
}

export async function deleteProduct(id: string, actor: CurrentSession) {
  const existing = await findProductById(id);
  if (!existing) {
    throw new ValidationError('El modelo que intentas eliminar ya no existe.');
  }

  // Delete the bucket objects first — the DB rows cascade-delete with the
  // product (both product_images and product_colors, verified empirically:
  // Postgres resolves the whole cascade tree from one root DELETE before
  // any RESTRICT check runs), but nothing would otherwise clean up the
  // now-orphaned MinIO objects themselves.
  await Promise.all(existing.images.map((image) => deleteObject(image.storageKey)));

  await deleteProductRow(id);

  await recordAudit({
    actorId: actor.adminUser.id,
    action: 'product.deleted',
    targetType: 'Product',
    targetId: id,
    metadata: { code: existing.code, name: existing.name },
  });
}

async function assertColorBelongsToProduct(productColorId: string, productId: string) {
  const color = await findProductColorById(productColorId);
  if (!color || color.productId !== productId) {
    throw new ValidationError('El color seleccionado no pertenece a este producto.');
  }
  return color;
}

export async function uploadProductImage(
  productId: string,
  productColorId: string,
  file: { buffer: Buffer; contentType: string; size: number },
  actor: CurrentSession
) {
  const product = await findProductById(productId);
  if (!product) {
    throw new ValidationError('El modelo ya no existe.');
  }
  if (product.colors.length === 0) {
    throw new ValidationError('Primero debes agregar al menos un color al producto.');
  }
  await assertColorBelongsToProduct(productColorId, productId);

  const currentCount = await countProductImages(productId);
  if (currentCount >= MAX_PRODUCT_IMAGES) {
    throw new ValidationError(`Este producto ya tiene el máximo de ${MAX_PRODUCT_IMAGES} fotografías permitidas.`);
  }

  const meta = imageFileMetaSchema.safeParse({ type: file.contentType, size: file.size });
  if (!meta.success) {
    throw new ValidationError(meta.error.issues[0]?.message ?? 'Archivo inválido.');
  }

  let processed;
  try {
    processed = await processProductImage(file.buffer);
  } catch (error) {
    logger.error('product_image.process_failed', {
      productId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new ValidationError('No se pudo procesar la imagen. Verifica que el archivo no esté dañado.');
  }

  const storageKey = buildStorageKey(productId, 'photo', processed.extension);
  try {
    await uploadObject({ key: storageKey, body: processed.buffer, contentType: processed.contentType });
  } catch (error) {
    logger.error('product_image.upload_failed', { productId, error: error instanceof Error ? error.message : String(error) });
    throw new ValidationError('No se pudo subir la imagen al almacenamiento. Intenta nuevamente.');
  }

  const url = buildPublicUrl(storageKey);
  const nextSortOrder = (await getMaxSortOrder(productId)) + 1;
  const isFirstImage = currentCount === 0;

  let image;
  try {
    image = await createProductImageRow({
      productId,
      productColorId,
      storageKey,
      url,
      width: processed.width,
      height: processed.height,
      sortOrder: nextSortOrder,
      isCover: isFirstImage,
    });
  } catch (error) {
    await deleteObject(storageKey).catch((cleanupError) => {
      logger.error('product_image.orphan_cleanup_failed', {
        productId,
        storageKey,
        error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
      });
    });
    logger.error('product_image.persist_failed', { productId, error: error instanceof Error ? error.message : String(error) });
    throw new ValidationError('No se pudo guardar la imagen. Intenta nuevamente.');
  }

  await recordAudit({
    actorId: actor.adminUser.id,
    action: 'product.image_uploaded',
    targetType: 'Product',
    targetId: productId,
    metadata: { imageId: image.id, productColorId },
  });

  return image;
}

export async function replaceProductImage(
  imageId: string,
  file: { buffer: Buffer; contentType: string; size: number },
  actor: CurrentSession
) {
  const existingImage = await findProductImageById(imageId);
  if (!existingImage) {
    throw new ValidationError('La fotografía ya no existe.');
  }

  const meta = imageFileMetaSchema.safeParse({ type: file.contentType, size: file.size });
  if (!meta.success) {
    throw new ValidationError(meta.error.issues[0]?.message ?? 'Archivo inválido.');
  }

  let processed;
  try {
    processed = await processProductImage(file.buffer);
  } catch (error) {
    logger.error('product_image.process_failed', { imageId, error: error instanceof Error ? error.message : String(error) });
    throw new ValidationError('No se pudo procesar la imagen. Verifica que el archivo no esté dañado.');
  }

  const storageKey = buildStorageKey(existingImage.productId, 'photo', processed.extension);
  try {
    await uploadObject({ key: storageKey, body: processed.buffer, contentType: processed.contentType });
  } catch (error) {
    logger.error('product_image.upload_failed', { imageId, error: error instanceof Error ? error.message : String(error) });
    throw new ValidationError('No se pudo subir la imagen al almacenamiento. Intenta nuevamente.');
  }

  const url = buildPublicUrl(storageKey);

  // Same safe ordering as before: persist the new object+row before
  // touching the old object, so a failure here never leaves the gallery
  // entry without any working image.
  let image;
  try {
    image = await updateProductImageRow(imageId, {
      storageKey,
      url,
      width: processed.width,
      height: processed.height,
    });
  } catch (error) {
    await deleteObject(storageKey).catch((cleanupError) => {
      logger.error('product_image.orphan_cleanup_failed', {
        imageId,
        storageKey,
        error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
      });
    });
    logger.error('product_image.persist_failed', { imageId, error: error instanceof Error ? error.message : String(error) });
    throw new ValidationError('No se pudo guardar la imagen. Intenta nuevamente.');
  }

  await deleteObject(existingImage.storageKey).catch((error) => {
    logger.error('product_image.old_object_cleanup_failed', {
      imageId,
      error: error instanceof Error ? error.message : String(error),
    });
  });

  await recordAudit({
    actorId: actor.adminUser.id,
    action: 'product.image_replaced',
    targetType: 'Product',
    targetId: existingImage.productId,
    metadata: { imageId },
  });

  return image;
}

export async function deleteProductImage(imageId: string, actor: CurrentSession) {
  const existingImage = await findProductImageById(imageId);
  if (!existingImage) {
    throw new ValidationError('La fotografía ya no existe.');
  }

  // Row first — it's the authoritative reference; if the storage delete
  // below fails, the worst outcome is a harmless orphaned object in the
  // bucket (logged), not a row pointing at a missing file.
  await deleteProductImageRow(existingImage.id);
  await deleteObject(existingImage.storageKey).catch((error) => {
    logger.error('product_image.delete_object_failed', {
      imageId,
      error: error instanceof Error ? error.message : String(error),
    });
  });

  if (existingImage.isCover) {
    const remaining = await listProductImages(existingImage.productId);
    if (remaining.length > 0) {
      // Already ordered by sortOrder asc — the earliest becomes the new cover.
      await updateProductImageRow(remaining[0].id, { isCover: true });
    }
  }

  await recordAudit({
    actorId: actor.adminUser.id,
    action: 'product.image_deleted',
    targetType: 'Product',
    targetId: existingImage.productId,
    metadata: { imageId },
  });
}

export async function changeProductImageColor(imageId: string, productColorId: string, actor: CurrentSession) {
  const existingImage = await findProductImageById(imageId);
  if (!existingImage) {
    throw new ValidationError('La fotografía ya no existe.');
  }
  await assertColorBelongsToProduct(productColorId, existingImage.productId);

  const image = await updateProductImageRow(imageId, { productColorId });

  await recordAudit({
    actorId: actor.adminUser.id,
    action: 'product.image_color_changed',
    targetType: 'Product',
    targetId: existingImage.productId,
    metadata: { imageId, productColorId },
  });

  return image;
}

export async function setCoverImage(imageId: string, actor: CurrentSession) {
  const existingImage = await findProductImageById(imageId);
  if (!existingImage) {
    throw new ValidationError('La fotografía ya no existe.');
  }
  if (existingImage.isCover) {
    return existingImage;
  }

  // Always sequential within one transaction — unset the current cover,
  // then set the new one — never both true at once, which the partial
  // unique index (one cover per product) would reject.
  await runInTransaction((tx) => setCoverImageRows(tx, existingImage.productId, imageId));

  await recordAudit({
    actorId: actor.adminUser.id,
    action: 'product.image_cover_changed',
    targetType: 'Product',
    targetId: existingImage.productId,
    metadata: { imageId },
  });

  return findProductImageById(imageId);
}

export async function reorderProductImages(productId: string, orderedImageIds: string[], actor: CurrentSession) {
  const current = await listProductImages(productId);
  const currentIds = new Set(current.map((img) => img.id));
  const providedIds = new Set(orderedImageIds);

  const sameSet = currentIds.size === providedIds.size && [...currentIds].every((id) => providedIds.has(id));
  if (!sameSet) {
    throw new ValidationError('El orden enviado no coincide con las fotografías actuales del producto.');
  }

  await runInTransaction((tx) => reorderProductImagesRows(tx, orderedImageIds));

  await recordAudit({
    actorId: actor.adminUser.id,
    action: 'product.image_reordered',
    targetType: 'Product',
    targetId: productId,
    metadata: { order: orderedImageIds },
  });
}
