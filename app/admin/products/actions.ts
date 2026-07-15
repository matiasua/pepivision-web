'use server';

import { requireSession } from '@/modules/auth/service';
import {
  addProductColorSchema,
  changeProductImageColorSchema,
  productFormSchema,
  reassignProductColorSchema,
  removeProductColorSchema,
  reorderProductImagesSchema,
} from '@/modules/catalog/admin-schemas';
import {
  addProductColor,
  changeProductImageColor,
  createProduct,
  deleteProduct,
  deleteProductImage,
  reassignAndRemoveProductColor,
  removeProductColor,
  reorderProductImages,
  replaceProductImage,
  setCoverImage,
  updateProduct,
  uploadProductImage,
} from '@/modules/catalog/admin-service';
import { offeringFormSchema, setOfferingActiveSchema } from '@/modules/catalog/offering-schemas';
import { createOffering, setOfferingActive, updateOffering } from '@/modules/catalog/offering-service';
import type { ProductFormValues } from '@/components/admin/ProductForm';
import { toErrorResponse } from '@/lib/errors';
import { logger } from '@/lib/logger';

type SaveActionResult = { status: 'error'; message: string } | { status: 'success'; productId: string };

function parseValues(values: ProductFormValues) {
  return productFormSchema.safeParse({
    ...values,
    badge: values.badge || undefined,
  });
}

export async function createProductAction(values: ProductFormValues): Promise<SaveActionResult> {
  const session = await requireSession();
  const parsed = parseValues(values);
  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Revisa los datos ingresados.' };
  }
  try {
    const product = await createProduct(parsed.data, session);
    return { status: 'success', productId: product.id };
  } catch (error) {
    logger.error('product.create_failed', { error: error instanceof Error ? error.message : String(error) });
    return { status: 'error', message: toErrorResponse(error).message };
  }
}

export async function updateProductAction(id: string, values: ProductFormValues): Promise<SaveActionResult> {
  const session = await requireSession();
  const parsed = parseValues(values);
  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Revisa los datos ingresados.' };
  }
  try {
    const product = await updateProduct(id, parsed.data, session);
    return { status: 'success', productId: product.id };
  } catch (error) {
    logger.error('product.update_failed', { productId: id, error: error instanceof Error ? error.message : String(error) });
    return { status: 'error', message: toErrorResponse(error).message };
  }
}

export interface ProductColorView {
  id: string;
  name: string;
  hex: string;
}

export type AddColorActionResult = { status: 'error'; message: string } | { status: 'success'; color: ProductColorView };

export async function addProductColorAction(productId: string, input: { name: string; hex: string }): Promise<AddColorActionResult> {
  const session = await requireSession();
  const parsed = addProductColorSchema.safeParse(input);
  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Revisa los datos del color.' };
  }
  try {
    const color = await addProductColor(productId, parsed.data, session);
    return { status: 'success', color: { id: color.id, name: color.name, hex: color.hex } };
  } catch (error) {
    logger.error('product.color_add_failed', { productId, error: error instanceof Error ? error.message : String(error) });
    return { status: 'error', message: toErrorResponse(error).message };
  }
}

export type RemoveColorActionResult =
  | { status: 'error'; message: string }
  | { status: 'blocked'; message: string; photoCount: number }
  | { status: 'success' };

export async function removeProductColorAction(productId: string, colorId: string): Promise<RemoveColorActionResult> {
  const session = await requireSession();
  const parsed = removeProductColorSchema.safeParse({ colorId });
  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };
  }
  try {
    const result = await removeProductColor(productId, parsed.data.colorId, session);
    if (result.status === 'blocked') {
      const plural = result.photoCount === 1 ? 'fotografía asociada' : 'fotografías asociadas';
      return {
        status: 'blocked',
        message: `El color no puede eliminarse porque tiene ${result.photoCount} ${plural}.`,
        photoCount: result.photoCount,
      };
    }
    return { status: 'success' };
  } catch (error) {
    logger.error('product.color_remove_failed', { productId, colorId, error: error instanceof Error ? error.message : String(error) });
    return { status: 'error', message: toErrorResponse(error).message };
  }
}

export type ReassignColorActionResult = { status: 'error'; message: string } | { status: 'success'; movedCount: number };

export async function reassignAndRemoveProductColorAction(
  productId: string,
  fromColorId: string,
  toColorId: string
): Promise<ReassignColorActionResult> {
  const session = await requireSession();
  const parsed = reassignProductColorSchema.safeParse({ fromColorId, toColorId });
  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };
  }
  try {
    const result = await reassignAndRemoveProductColor(productId, parsed.data.fromColorId, parsed.data.toColorId, session);
    return { status: 'success', movedCount: result.movedCount };
  } catch (error) {
    logger.error('product.color_reassign_failed', { productId, error: error instanceof Error ? error.message : String(error) });
    return { status: 'error', message: toErrorResponse(error).message };
  }
}

export async function deleteProductAction(id: string): Promise<void> {
  const session = await requireSession();
  await deleteProduct(id, session);
}

export interface ProductImageView {
  id: string;
  url: string;
  productColorId: string;
  sortOrder: number;
  isCover: boolean;
}

export type ImageActionResult = { status: 'error'; message: string } | { status: 'success'; image: ProductImageView };

function toView(image: { id: string; url: string; productColorId: string; sortOrder: number; isCover: boolean }): ProductImageView {
  return {
    id: image.id,
    url: image.url,
    productColorId: image.productColorId,
    sortOrder: image.sortOrder,
    isCover: image.isCover,
  };
}

export async function uploadProductImageAction(
  productId: string,
  productColorId: string,
  formData: FormData
): Promise<ImageActionResult> {
  const session = await requireSession();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return { status: 'error', message: 'Selecciona un archivo de imagen.' };
  }
  if (!productColorId) {
    return { status: 'error', message: 'Selecciona un color antes de subir la fotografía.' };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const image = await uploadProductImage(productId, productColorId, { buffer, contentType: file.type, size: file.size }, session);
    return { status: 'success', image: toView(image) };
  } catch (error) {
    // Never forward raw error messages here: they may originate from
    // Sharp, MinIO/S3, or Prisma and can leak internal details (storage
    // keys, connection info). toErrorResponse() only exposes messages from
    // errors explicitly marked `expose` (e.g. ValidationError); everything
    // else becomes a generic message, with the real detail going to the log.
    logger.error('product_image.upload_action_failed', {
      productId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { status: 'error', message: toErrorResponse(error).message };
  }
}

export async function replaceProductImageAction(imageId: string, formData: FormData): Promise<ImageActionResult> {
  const session = await requireSession();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return { status: 'error', message: 'Selecciona un archivo de imagen.' };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const image = await replaceProductImage(imageId, { buffer, contentType: file.type, size: file.size }, session);
    return { status: 'success', image: toView(image) };
  } catch (error) {
    logger.error('product_image.replace_action_failed', {
      imageId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { status: 'error', message: toErrorResponse(error).message };
  }
}

export type SimpleActionResult = { status: 'error'; message: string } | { status: 'success' };

export async function deleteProductImageAction(imageId: string): Promise<SimpleActionResult> {
  const session = await requireSession();
  try {
    await deleteProductImage(imageId, session);
    return { status: 'success' };
  } catch (error) {
    logger.error('product_image.delete_action_failed', {
      imageId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { status: 'error', message: toErrorResponse(error).message };
  }
}

export async function changeProductImageColorAction(imageId: string, productColorId: string): Promise<SimpleActionResult> {
  const session = await requireSession();
  const parsed = changeProductImageColorSchema.safeParse({ imageId, productColorId });
  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };
  }
  try {
    await changeProductImageColor(parsed.data.imageId, parsed.data.productColorId, session);
    return { status: 'success' };
  } catch (error) {
    logger.error('product_image.color_change_action_failed', {
      imageId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { status: 'error', message: toErrorResponse(error).message };
  }
}

export async function setCoverImageAction(imageId: string): Promise<SimpleActionResult> {
  const session = await requireSession();
  try {
    await setCoverImage(imageId, session);
    return { status: 'success' };
  } catch (error) {
    logger.error('product_image.cover_action_failed', {
      imageId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { status: 'error', message: toErrorResponse(error).message };
  }
}

export async function reorderProductImagesAction(productId: string, orderedImageIds: string[]): Promise<SimpleActionResult> {
  const session = await requireSession();
  const parsed = reorderProductImagesSchema.safeParse({ orderedImageIds });
  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };
  }
  try {
    await reorderProductImages(productId, parsed.data.orderedImageIds, session);
    return { status: 'success' };
  } catch (error) {
    logger.error('product_image.reorder_action_failed', {
      productId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { status: 'error', message: toErrorResponse(error).message };
  }
}

// --- "Disponibilidad en el catálogo" (ProductOffering) — redesign-extensible-catalog-v2, Fase 4 ---
// ADMIN y SUPERADMIN por igual (requireSession(), no requireRole) — ver
// design.md → "Autorización": administrar ofertas es mercadeo rutinario,
// mismo nivel de confianza que color/imagen de producto. La estructura de
// categorías (crear/editar/reordenar/capabilities/atributos) sí requiere
// SUPERADMIN — ver app/admin/categories/actions.ts.

export interface OfferingView {
  id: string;
  categoryId: string;
  categoryName: string;
  title: string | null;
  commercialDescription: string | null;
  priceFromClp: number | null;
  active: boolean;
  visible: boolean;
  featured: boolean;
  sortOrder: number;
  seoTitle: string | null;
  seoDescription: string | null;
}

type OfferingActionResult = { status: 'error'; message: string } | { status: 'success'; offering: OfferingView };

function toOfferingView(offering: {
  id: string;
  categoryId: string;
  category?: { name: string };
  title: string | null;
  commercialDescription: string | null;
  priceFromClp: number | null;
  active: boolean;
  visible: boolean;
  featured: boolean;
  sortOrder: number;
  seoTitle: string | null;
  seoDescription: string | null;
}): OfferingView {
  return {
    id: offering.id,
    categoryId: offering.categoryId,
    categoryName: offering.category?.name ?? '',
    title: offering.title,
    commercialDescription: offering.commercialDescription,
    priceFromClp: offering.priceFromClp,
    active: offering.active,
    visible: offering.visible,
    featured: offering.featured,
    sortOrder: offering.sortOrder,
    seoTitle: offering.seoTitle,
    seoDescription: offering.seoDescription,
  };
}

export async function createOfferingAction(input: unknown): Promise<OfferingActionResult> {
  const session = await requireSession();
  const parsed = offeringFormSchema.safeParse(input);
  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Revisa los datos de la oferta.' };
  }
  try {
    const offering = await createOffering(parsed.data, session);
    return { status: 'success', offering: toOfferingView(offering) };
  } catch (error) {
    logger.error('offering.create_failed', { error: error instanceof Error ? error.message : String(error) });
    return { status: 'error', message: toErrorResponse(error).message };
  }
}

export async function updateOfferingAction(id: string, input: unknown): Promise<OfferingActionResult> {
  const session = await requireSession();
  const parsed = offeringFormSchema.safeParse(input);
  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Revisa los datos de la oferta.' };
  }
  try {
    const offering = await updateOffering(id, parsed.data, session);
    return { status: 'success', offering: toOfferingView(offering) };
  } catch (error) {
    logger.error('offering.update_failed', { offeringId: id, error: error instanceof Error ? error.message : String(error) });
    return { status: 'error', message: toErrorResponse(error).message };
  }
}

export async function setOfferingActiveAction(offeringId: string, active: boolean): Promise<SimpleActionResult> {
  const session = await requireSession();
  const parsed = setOfferingActiveSchema.safeParse({ offeringId, active });
  if (!parsed.success) {
    return { status: 'error', message: 'Datos inválidos.' };
  }
  try {
    await setOfferingActive(parsed.data.offeringId, parsed.data.active, session);
    return { status: 'success' };
  } catch (error) {
    logger.error('offering.set_active_failed', { offeringId, error: error instanceof Error ? error.message : String(error) });
    return { status: 'error', message: toErrorResponse(error).message };
  }
}
