import type { DataRightStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export function listDataRightsRequestsForAdmin() {
  return prisma.dataRightsRequest.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
  });
}

export function findDataRightsRequestById(id: string) {
  return prisma.dataRightsRequest.findUnique({ where: { id } });
}

export function updateDataRightsStatusRow(
  id: string,
  data: {
    status: DataRightStatus;
    resolutionNotes: string | null;
    resolvedById: string | null;
    resolvedAt: Date | null;
  }
) {
  return prisma.dataRightsRequest.update({ where: { id }, data });
}
