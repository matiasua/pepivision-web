import { S3Client } from '@aws-sdk/client-s3';
import { env } from '@/lib/env';

// Singleton, same rationale as lib/prisma.ts / modules/notifications/client.ts:
// avoids opening a fresh client on every dev-mode hot reload.
const globalForStorage = globalThis as unknown as { s3Client?: S3Client; s3PresignClient?: S3Client };

function createClient(endpoint: string): S3Client {
  return new S3Client({
    endpoint,
    region: env.OBJECT_STORAGE_REGION,
    forcePathStyle: env.OBJECT_STORAGE_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: env.OBJECT_STORAGE_ACCESS_KEY,
      secretAccessKey: env.OBJECT_STORAGE_SECRET_KEY,
    },
  });
}

// Server-to-server operations (upload/delete) — reachable only on the
// internal Docker network in development (`http://minio:9000`), which is
// exactly where these calls run from.
export const s3Client = globalForStorage.s3Client ?? createClient(env.OBJECT_STORAGE_ENDPOINT);

/**
 * Used ONLY to mint presigned URLs for the private attachments bucket. A
 * SigV4 signature is bound to the exact host the request will actually hit
 * — signing against OBJECT_STORAGE_ENDPOINT (internal-only) would produce a
 * URL the browser can never reach, same reason buildPublicUrl() in
 * modules/storage/service.ts uses OBJECT_STORAGE_PUBLIC_URL instead of the
 * internal endpoint for the public bucket.
 */
export const s3PresignClient = globalForStorage.s3PresignClient ?? createClient(env.OBJECT_STORAGE_PUBLIC_URL);

if (env.NODE_ENV !== 'production') {
  globalForStorage.s3Client = s3Client;
  globalForStorage.s3PresignClient = s3PresignClient;
}
