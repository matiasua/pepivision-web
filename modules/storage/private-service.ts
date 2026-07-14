import { randomBytes } from 'node:crypto';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '@/lib/env';
import { s3Client, s3PresignClient } from './client';

const SIGNED_URL_EXPIRY_SECONDS = 60; // short-lived on purpose — see modules/requests/admin-service.ts.

/**
 * Sensitive request attachments (prescriptions) live in a *separate*,
 * private bucket (`PRIVATE_OBJECT_STORAGE_BUCKET`) — never the public
 * product-photo bucket, never anonymously readable, and never referenced
 * by a permanent public URL anywhere (unlike modules/storage/service.ts's
 * buildPublicUrl). The only way to read one back is a short-lived signed
 * URL minted on demand, after the caller has already been authenticated
 * and authorized (see getAttachmentDownloadUrl in admin-service.ts).
 */
export function buildAttachmentStorageKey(extension: string): string {
  const random = randomBytes(16).toString('hex');
  return `prescriptions/${random}.${extension}`;
}

export async function uploadPrivateObject(params: { key: string; body: Buffer; contentType: string }): Promise<void> {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: env.PRIVATE_OBJECT_STORAGE_BUCKET,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
    })
  );
}

export async function deletePrivateObject(key: string): Promise<void> {
  await s3Client.send(new DeleteObjectCommand({ Bucket: env.PRIVATE_OBJECT_STORAGE_BUCKET, Key: key }));
}

/**
 * Mints a signed GET URL valid for a minute — call only after verifying the
 * requester is an authenticated, authorized admin. Signed via
 * s3PresignClient (the browser-reachable endpoint), not s3Client — the
 * resulting URL is opened directly by the admin's browser, so it must be
 * signed against a host that browser can actually resolve.
 */
export function getSignedAttachmentUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: env.PRIVATE_OBJECT_STORAGE_BUCKET, Key: key });
  return getSignedUrl(s3PresignClient, command, { expiresIn: SIGNED_URL_EXPIRY_SECONDS });
}
