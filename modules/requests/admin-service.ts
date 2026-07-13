import { RequestStatus } from '@prisma/client';
import { ValidationError } from '@/lib/errors';
import { buildWhatsAppLinkToPhone } from '@/lib/whatsapp';
import type { CurrentSession } from '@/modules/auth/service';
import { recordAudit } from '@/modules/auth/service';
import {
  findRequestById,
  listRequestsForAdmin,
  softDeleteRequestRow,
  toggleRequestStatusRow,
} from './admin-repository';
import type { RequestFilterInput } from './admin-schemas';

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
}): AdminRequestView {
  return {
    ...request,
    whatsappHref: buildWhatsAppLinkToPhone(
      request.phone,
      `Hola ${request.name}, te escribimos de Pepi Visión 360 respecto a tu solicitud.`
    ),
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
