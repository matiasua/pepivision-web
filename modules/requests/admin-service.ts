import { RequestStatus } from '@prisma/client';
import { ValidationError } from '@/lib/errors';
import { buildWhatsAppLinkToPhone } from '@/lib/whatsapp';
import type { CurrentSession } from '@/modules/auth/service';
import { recordAudit } from '@/modules/auth/service';
import { getSignedAttachmentUrl } from '@/modules/storage/private-service';
import {
  findAttachmentById,
  findRequestById,
  listRequestsForAdmin,
  softDeleteRequestRow,
  toggleRequestStatusRow,
} from './admin-repository';
import type { RequestFilterInput } from './admin-schemas';

export interface AdminRequestAttachmentView {
  id: string;
  type: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface AdminRequestView {
  id: string;
  type: string;
  status: string;
  name: string;
  phone: string;
  email: string | null;
  comuna: string | null;
  message: string | null;
  hasPrescription: boolean | null;
  details: unknown;
  createdAt: Date;
  retentionExpiresAt: Date;
  whatsappHref: string;
  attachment: AdminRequestAttachmentView | null;
}

function toView(request: {
  id: string;
  type: string;
  status: string;
  name: string;
  phone: string;
  email: string | null;
  comuna: string | null;
  message: string | null;
  hasPrescription: boolean | null;
  details: unknown;
  createdAt: Date;
  retentionExpiresAt: Date;
  attachments: { id: string; type: string; originalFileName: string; mimeType: string; sizeBytes: number }[];
}): AdminRequestView {
  const [attachment] = request.attachments;
  return {
    ...request,
    whatsappHref: buildWhatsAppLinkToPhone(
      request.phone,
      `Hola ${request.name}, te escribimos de Pepi Visión 360 respecto a tu solicitud.`
    ),
    attachment: attachment
      ? {
          id: attachment.id,
          type: attachment.type,
          originalFileName: attachment.originalFileName,
          mimeType: attachment.mimeType,
          sizeBytes: attachment.sizeBytes,
        }
      : null,
  };
}

export async function listRequests(filters: RequestFilterInput): Promise<AdminRequestView[]> {
  const requests = await listRequestsForAdmin(filters);
  return requests.map(toView);
}

export async function toggleRequestStatus(requestId: string, actor: CurrentSession) {
  const existing = await findRequestById(requestId);
  if (!existing) {
    throw new ValidationError('La solicitud ya no existe.');
  }
  const nextStatus = existing.status === RequestStatus.NEW ? RequestStatus.HANDLED : RequestStatus.NEW;
  const updated = await toggleRequestStatusRow(requestId, nextStatus);

  await recordAudit({
    actorId: actor.adminUser.id,
    action: 'request.status_changed',
    targetType: 'Request',
    targetId: requestId,
    metadata: { from: existing.status, to: nextStatus },
  });

  return updated;
}

export async function deleteRequest(requestId: string, actor: CurrentSession) {
  const existing = await findRequestById(requestId);
  if (!existing) {
    throw new ValidationError('La solicitud ya no existe.');
  }

  await softDeleteRequestRow(requestId);

  await recordAudit({
    actorId: actor.adminUser.id,
    action: 'request.deleted',
    targetType: 'Request',
    targetId: requestId,
    metadata: { type: existing.type, name: existing.name },
  });
}

/**
 * Mints a short-lived signed URL for a prescription attachment. Callers
 * must have already resolved an authenticated `CurrentSession` (see
 * requireSession() in app/admin/requests/actions.ts) — this function
 * additionally verifies the attachment still exists and isn't soft-deleted
 * before ever touching the private bucket, and logs every access so
 * viewing/downloading a customer's prescription is always attributable.
 */
export async function getAttachmentDownloadUrl(attachmentId: string, actor: CurrentSession): Promise<string> {
  const attachment = await findAttachmentById(attachmentId);
  if (!attachment || attachment.deletedAt) {
    throw new ValidationError('El adjunto ya no está disponible.');
  }

  const url = await getSignedAttachmentUrl(attachment.storageKey);

  await recordAudit({
    actorId: actor.adminUser.id,
    action: 'request.attachment_viewed',
    targetType: 'RequestAttachment',
    targetId: attachment.id,
    metadata: { requestId: attachment.requestId },
  });

  return url;
}
