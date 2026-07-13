import { prisma } from '@/lib/prisma';

// Singleton row: always the same fixed id, so `upsert` behaves as a true
// get-or-create/update for "the one" BusinessSettings row (see design.md).
const SINGLETON_ID = 'singleton';

export function getBusinessSettingsRow() {
  return prisma.businessSettings.findUnique({ where: { id: SINGLETON_ID } });
}

export function upsertBusinessSettingsRow(
  data: {
    whatsappNumber: string;
    phoneDisplay: string;
    email: string;
    instagramHandle: string;
    hoursText: string;
    locationText: string;
    requestRetentionMonths: number;
    dataRightsRetentionMonths: number;
  },
  actorId: string
) {
  return prisma.businessSettings.upsert({
    where: { id: SINGLETON_ID },
    update: { ...data, updatedById: actorId },
    create: { id: SINGLETON_ID, ...data, updatedById: actorId },
  });
}
