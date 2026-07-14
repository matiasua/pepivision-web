import { z } from 'zod';

export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB, before server-side re-encoding.

export const imageFileMetaSchema = z.object({
  type: z.enum(ALLOWED_IMAGE_MIME_TYPES, {
    message: 'Formato de imagen no permitido. Usa JPG, PNG o WEBP.',
  }),
  size: z
    .number()
    .positive('El archivo está vacío.')
    .max(MAX_IMAGE_BYTES, `La imagen no puede superar ${MAX_IMAGE_BYTES / (1024 * 1024)} MB.`),
});
export type ImageFileMeta = z.infer<typeof imageFileMetaSchema>;

// Prescription attachments: PDF in addition to the same image formats,
// and a larger ceiling (a photographed prescription can legitimately be
// heavier than a product photo) — but still a real, bounded limit, not
// "unlimited". See modules/storage/private-service.ts for where this file
// actually ends up (the private bucket, never the public product one).
export const ALLOWED_ATTACHMENT_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB.

export const attachmentFileMetaSchema = z.object({
  type: z.enum(ALLOWED_ATTACHMENT_MIME_TYPES, {
    message: 'Formato no permitido. Usa PDF, JPG, PNG o WEBP.',
  }),
  size: z
    .number()
    .positive('El archivo está vacío.')
    .max(MAX_ATTACHMENT_BYTES, `El archivo no puede superar ${MAX_ATTACHMENT_BYTES / (1024 * 1024)} MB.`),
});
export type AttachmentFileMeta = z.infer<typeof attachmentFileMetaSchema>;
