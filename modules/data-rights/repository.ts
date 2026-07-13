import type { DataRightType } from '@prisma/client';
import { prisma } from '@/lib/prisma';

interface CreateDataRightsRequestInput {
  rightType: DataRightType;
  name: string;
  email: string;
  phone: string | null;
  description: string;
  consentAcceptedAt: Date;
  retentionExpiresAt: Date;
}

export function createDataRightsRequest(input: CreateDataRightsRequestInput) {
  return prisma.dataRightsRequest.create({ data: input });
}
