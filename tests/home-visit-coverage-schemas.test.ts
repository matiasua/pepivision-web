import { describe, expect, it } from 'vitest';
import { createComunaSchema } from '@/modules/home-visit-coverage/schemas';

describe('modules/home-visit-coverage/schemas', () => {
  it('accepts a valid comuna name without region', () => {
    const result = createComunaSchema.safeParse({ name: 'Ñuñoa' });
    expect(result.success).toBe(true);
  });

  it('treats empty-string region as absent', () => {
    const result = createComunaSchema.safeParse({ name: 'Ñuñoa', region: '' });
    expect(result.success && result.data.region).toBeUndefined();
  });

  it('rejects a name shorter than 2 characters', () => {
    expect(createComunaSchema.safeParse({ name: 'Q' }).success).toBe(false);
  });
});
