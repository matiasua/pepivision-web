import { randomBytes } from 'node:crypto';
import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { env } from '@/lib/env';
import { s3Client } from './client';

export function buildStorageKey(productId: string, slot: string, extension: string): string {
  const suffix = randomBytes(8).toString('hex');
  return `products/${productId}/${slot.toLowerCase()}-${suffix}.${extension}`;
}

/**
 * Category cover image key (redesign-extensible-catalog-v2, Fase 6) —
 * mirrors `buildStorageKey`'s pattern (`categories/${categoryId}/cover-
 * ${random}.${extension}`, see design.md → "Imágenes de categoría").
 * `categoryId` is a server-generated cuid, never user input, so this key
 * never embeds an original filename or a locally-supplied path.
 */
export function buildCategoryStorageKey(categoryId: string, extension: string): string {
  const suffix = randomBytes(8).toString('hex');
  return `categories/${categoryId}/cover-${suffix}.${extension}`;
}

export function buildPublicUrl(key: string): string {
  return `${env.OBJECT_STORAGE_PUBLIC_URL}/${env.OBJECT_STORAGE_BUCKET}/${key}`;
}

export async function uploadObject(params: { key: string; body: Buffer; contentType: string }): Promise<void> {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: env.OBJECT_STORAGE_BUCKET,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
    })
  );
}

export async function deleteObject(key: string): Promise<void> {
  await s3Client.send(new DeleteObjectCommand({ Bucket: env.OBJECT_STORAGE_BUCKET, Key: key }));
}
