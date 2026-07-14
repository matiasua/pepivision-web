import { Prisma, RequestStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { RequestFilterInput } from './admin-schemas';

function buildWhere(filters: RequestFilterInput): Prisma.RequestWhereInput {
  const where: Prisma.RequestWhereInput = { deletedAt: null };

  if (filters.type) where.type = filters.type;
  if (filters.status) where.status = filters.status;
  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {
      ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
      ...(filters.dateTo ? { lte: new Date(`${filters.dateTo}T23:59:59.999Z`) } : {}),
    };
  }

  return where;
}

const ACTIVE_ATTACHMENTS_INCLUDE = { attachments: { where: { deletedAt: null } } } as const;

export function listRequestsForAdmin(filters: RequestFilterInput) {
  return prisma.request.findMany({
    where: buildWhere(filters),
    orderBy: { createdAt: 'desc' },
    include: ACTIVE_ATTACHMENTS_INCLUDE,
  });
}

export function findRequestById(id: string) {
  return prisma.request.findUnique({ where: { id }, include: ACTIVE_ATTACHMENTS_INCLUDE });
}

export function findAttachmentById(id: string) {
  return prisma.requestAttachment.findUnique({ where: { id } });
}

export function toggleRequestStatusRow(id: string, nextStatus: RequestStatus) {
  return prisma.request.update({ where: { id }, data: { status: nextStatus } });
}

export function softDeleteRequestRow(id: string) {
  return prisma.request.update({ where: { id }, data: { deletedAt: new Date() } });
}
