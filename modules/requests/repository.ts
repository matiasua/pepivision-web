import { Prisma, RequestAttachmentType, RequestType } from '@prisma/client';
import { prisma } from '@/lib/prisma';

interface CreateRequestInput {
  type: RequestType;
  name: string;
  phone: string;
  email: string | null;
  comuna: string | null;
  message: string | null;
  hasPrescription: boolean | null;
  details: Prisma.InputJsonValue;
  consentAcceptedAt: Date;
  retentionExpiresAt: Date;
  // Nested-created in the same write as the Request row itself, so it's
  // one atomic Prisma call — if it fails, nothing lands in Postgres at
  // all, and the caller's only cleanup is the already-uploaded object in
  // the private bucket (see modules/requests/service.ts).
  attachment?: {
    type: RequestAttachmentType;
    storageKey: string;
    originalFileName: string;
    mimeType: string;
    sizeBytes: number;
  };
}

export function createRequest(input: CreateRequestInput) {
  const { attachment, ...requestFields } = input;
  return prisma.request.create({
    data: {
      ...requestFields,
      attachments: attachment ? { create: [attachment] } : undefined,
    },
  });
}

/** Case-insensitive lookup against the active comuna list (home-visit-coverage). */
export function findActiveComunaByName(name: string) {
  return prisma.enabledComuna.findFirst({
    where: { active: true, name: { equals: name.trim(), mode: 'insensitive' } },
  });
}
