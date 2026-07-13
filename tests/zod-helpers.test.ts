import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { optionalNonEmpty } from '@/lib/zod-helpers';

describe('lib/zod-helpers — optionalNonEmpty', () => {
  it('treats an empty string as undefined even when the inner schema would accept it', () => {
    const schema = optionalNonEmpty(z.string().trim().max(80));
    const result = schema.safeParse('');
    expect(result.success && result.data).toBeUndefined();
  });

  it('passes through undefined', () => {
    const schema = optionalNonEmpty(z.string().trim().max(80));
    expect(schema.safeParse(undefined).success).toBe(true);
  });

  it('passes through a valid non-empty value', () => {
    const schema = optionalNonEmpty(z.string().trim().max(80));
    const result = schema.safeParse('Providencia');
    expect(result.success && result.data).toBe('Providencia');
  });

  it('still enforces the inner schema for non-empty input', () => {
    const schema = optionalNonEmpty(z.string().email());
    expect(schema.safeParse('not-an-email').success).toBe(false);
  });
});
