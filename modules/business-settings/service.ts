import { siteConfig } from '@/lib/site-config';
import { businessDefaults } from '@/lib/business-defaults';
import type { CurrentSession } from '@/modules/auth/service';
import { recordAudit } from '@/modules/auth/service';
import { getBusinessSettingsRow, upsertBusinessSettingsRow } from './repository';
import type { BusinessSettingsFormInput } from './schemas';

export interface EffectiveBusinessSettings {
  whatsappNumber: string;
  phoneDisplay: string;
  email: string;
  instagramHandle: string;
  hoursText: string;
  locationText: string;
  requestRetentionMonths: number;
  dataRightsRetentionMonths: number;
  /** Same address as `email` — this app doesn't model a distinct notification recipient. */
  notificationEmail: string;
  isPersisted: boolean;
}

/**
 * Falls back to lib/site-config.ts + lib/business-defaults.ts (the Fase
 * 3/5 placeholders) until a SUPERADMIN saves real settings in
 * `/admin/settings` — see design.md, task 6.16.
 */
export async function getEffectiveBusinessSettings(): Promise<EffectiveBusinessSettings> {
  const row = await getBusinessSettingsRow();

  if (!row) {
    return {
      whatsappNumber: siteConfig.waPhone,
      phoneDisplay: siteConfig.phoneDisplay,
      email: siteConfig.email,
      instagramHandle: siteConfig.instagram,
      hoursText: siteConfig.horario,
      locationText: siteConfig.ubicacion,
      requestRetentionMonths: businessDefaults.requestRetentionMonths,
      dataRightsRetentionMonths: businessDefaults.dataRightsRetentionMonths,
      notificationEmail: businessDefaults.notificationEmail,
      isPersisted: false,
    };
  }

  return {
    whatsappNumber: row.whatsappNumber,
    phoneDisplay: row.phoneDisplay,
    email: row.email,
    instagramHandle: row.instagramHandle,
    hoursText: row.hoursText,
    locationText: row.locationText,
    requestRetentionMonths: row.requestRetentionMonths,
    dataRightsRetentionMonths: row.dataRightsRetentionMonths,
    notificationEmail: row.email,
    isPersisted: true,
  };
}

export async function updateBusinessSettings(input: BusinessSettingsFormInput, actor: CurrentSession) {
  const row = await upsertBusinessSettingsRow(input, actor.adminUser.id);

  await recordAudit({
    actorId: actor.adminUser.id,
    action: 'business_settings.updated',
    targetType: 'BusinessSettings',
    targetId: row.id,
  });

  return row;
}
