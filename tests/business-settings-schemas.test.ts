import { describe, expect, it } from 'vitest';
import { businessSettingsFormSchema } from '@/modules/business-settings/schemas';

const base = {
  whatsappNumber: '56936992313',
  phoneDisplay: '+56 9 3699 2313',
  email: 'contacto@pepivision360.cl',
  instagramHandle: 'pepivision360',
  hoursText: 'Lunes a sábado de 10:00 a 18:00 hrs',
  locationText: 'Quilicura, Región Metropolitana',
  requestRetentionMonths: 12,
  dataRightsRetentionMonths: 12,
};

describe('modules/business-settings/schemas', () => {
  it('accepts a valid payload', () => {
    expect(businessSettingsFormSchema.safeParse(base).success).toBe(true);
  });

  it('rejects a whatsapp number with a leading +', () => {
    expect(businessSettingsFormSchema.safeParse({ ...base, whatsappNumber: '+56936992313' }).success).toBe(false);
  });

  it('rejects an instagram handle with @', () => {
    expect(businessSettingsFormSchema.safeParse({ ...base, instagramHandle: '@pepivision360' }).success).toBe(false);
  });

  it('rejects a retention period of 0 or negative', () => {
    expect(businessSettingsFormSchema.safeParse({ ...base, requestRetentionMonths: 0 }).success).toBe(false);
  });

  it('rejects an invalid email', () => {
    expect(businessSettingsFormSchema.safeParse({ ...base, email: 'not-an-email' }).success).toBe(false);
  });
});
