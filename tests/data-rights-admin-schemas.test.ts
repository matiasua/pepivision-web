import { describe, expect, it } from 'vitest';
import { changeDataRightsStatusSchema } from '@/modules/data-rights/admin-schemas';

describe('modules/data-rights/admin-schemas — changeDataRightsStatusSchema', () => {
  it('accepts moving to IN_REVIEW without resolution notes', () => {
    const result = changeDataRightsStatusSchema.safeParse({ dataRightsRequestId: 'dr_1', status: 'IN_REVIEW' });
    expect(result.success).toBe(true);
  });

  it('requires resolution notes when resolving', () => {
    const result = changeDataRightsStatusSchema.safeParse({ dataRightsRequestId: 'dr_1', status: 'RESOLVED' });
    expect(result.success).toBe(false);
  });

  it('requires resolution notes when rejecting', () => {
    const result = changeDataRightsStatusSchema.safeParse({ dataRightsRequestId: 'dr_1', status: 'REJECTED' });
    expect(result.success).toBe(false);
  });

  it('accepts resolving with notes', () => {
    const result = changeDataRightsStatusSchema.safeParse({
      dataRightsRequestId: 'dr_1',
      status: 'RESOLVED',
      resolutionNotes: 'Se envió la información solicitada por correo.',
    });
    expect(result.success).toBe(true);
  });
});
