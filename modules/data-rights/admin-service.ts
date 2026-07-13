import { DataRightStatus } from '@prisma/client';
import { ValidationError } from '@/lib/errors';
import type { CurrentSession } from '@/modules/auth/service';
import { recordAudit } from '@/modules/auth/service';
import {
  findDataRightsRequestById,
  listDataRightsRequestsForAdmin,
  updateDataRightsStatusRow,
} from './admin-repository';
import type { ChangeDataRightsStatusInput } from './admin-schemas';

export function listDataRightsRequests() {
  return listDataRightsRequestsForAdmin();
}

export async function changeDataRightsStatus(input: ChangeDataRightsStatusInput, actor: CurrentSession) {
  const existing = await findDataRightsRequestById(input.dataRightsRequestId);
  if (!existing) {
    throw new ValidationError('La solicitud ya no existe.');
  }

  const isResolving = input.status === DataRightStatus.RESOLVED || input.status === DataRightStatus.REJECTED;
  const updated = await updateDataRightsStatusRow(input.dataRightsRequestId, {
    status: input.status,
    resolutionNotes: input.resolutionNotes ?? existing.resolutionNotes ?? null,
    resolvedById: isResolving ? actor.adminUser.id : existing.resolvedById,
    resolvedAt: isResolving ? new Date() : existing.resolvedAt,
  });

  await recordAudit({
    actorId: actor.adminUser.id,
    action: 'data_rights_request.status_changed',
    targetType: 'DataRightsRequest',
    targetId: input.dataRightsRequestId,
    metadata: { from: existing.status, to: input.status },
  });

  return updated;
}
