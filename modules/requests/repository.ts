import { Prisma, RequestType } from '@prisma/client';
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
}

export function createRequest(input: CreateRequestInput) {
  return prisma.request.create({ data: input });
}

export function findProductById(id: string) {
  return prisma.product.findUnique({ where: { id }, select: { id: true, name: true, code: true } });
}

/** Case-insensitive lookup against the active comuna list (home-visit-coverage). */
export function findActiveComunaByName(name: string) {
  return prisma.enabledComuna.findFirst({
    where: { active: true, name: { equals: name.trim(), mode: 'insensitive' } },
  });
}
