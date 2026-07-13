import { describe, expect, it } from 'vitest';
import { computeRetentionExpiresAt } from '@/lib/retention';

describe('lib/retention', () => {
  it('adds the given number of months', () => {
    const createdAt = new Date('2026-01-15T10:00:00.000Z');
    const expires = computeRetentionExpiresAt(createdAt, 12);
    expect(expires.toISOString()).toBe('2027-01-15T10:00:00.000Z');
  });

  it('does not mutate the input date', () => {
    const createdAt = new Date('2026-01-15T10:00:00.000Z');
    computeRetentionExpiresAt(createdAt, 6);
    expect(createdAt.toISOString()).toBe('2026-01-15T10:00:00.000Z');
  });
});
