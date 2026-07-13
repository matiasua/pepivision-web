import { describe, expect, it } from 'vitest';
import { dataRightsRequestSchema } from '@/modules/data-rights/schemas';

const base = {
  name: 'María González',
  email: 'maria@example.cl',
  rightType: 'ACCESS' as const,
  description: 'Quiero saber qué datos tienen sobre mí.',
  consent: true,
};

describe('modules/data-rights/schemas', () => {
  it('accepts a valid submission without phone (optional)', () => {
    expect(dataRightsRequestSchema.safeParse(base).success).toBe(true);
  });

  it('rejects an invalid rightType', () => {
    const result = dataRightsRequestSchema.safeParse({ ...base, rightType: 'RUT_VERIFICATION' });
    expect(result.success).toBe(false);
  });

  it('rejects when consent is missing', () => {
    expect(dataRightsRequestSchema.safeParse({ ...base, consent: false }).success).toBe(false);
  });

  it('rejects a description that is too short', () => {
    expect(dataRightsRequestSchema.safeParse({ ...base, description: 'corto' }).success).toBe(false);
  });

  it('never accepts a rut field — data minimization', () => {
    const shape = dataRightsRequestSchema.shape as Record<string, unknown>;
    expect(shape.rut).toBeUndefined();
  });
});
