import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkPublicFormRateLimit } from '@/lib/public-form-rate-limit';

describe('lib/public-form-rate-limit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests under the limit', () => {
    const ip = '10.0.0.1';
    for (let i = 0; i < 4; i += 1) {
      expect(checkPublicFormRateLimit('quote', ip)).toBe(false);
    }
  });

  it('blocks once the limit is reached for that IP + form kind', () => {
    const ip = '10.0.0.2';
    for (let i = 0; i < 5; i += 1) checkPublicFormRateLimit('quote', ip);
    expect(checkPublicFormRateLimit('quote', ip)).toBe(true);
  });

  it('keeps independent counters per form kind for the same IP', () => {
    const ip = '10.0.0.3';
    for (let i = 0; i < 5; i += 1) checkPublicFormRateLimit('quote', ip);
    expect(checkPublicFormRateLimit('quote', ip)).toBe(true);
    // A different form from the same visitor is not affected by the quote limit.
    expect(checkPublicFormRateLimit('home_visit', ip)).toBe(false);
    expect(checkPublicFormRateLimit('data_rights', ip)).toBe(false);
  });

  it('keeps independent counters per IP for the same form kind', () => {
    const ipA = '10.0.0.4';
    const ipB = '10.0.0.5';
    for (let i = 0; i < 5; i += 1) checkPublicFormRateLimit('quote', ipA);
    expect(checkPublicFormRateLimit('quote', ipA)).toBe(true);
    expect(checkPublicFormRateLimit('quote', ipB)).toBe(false);
  });

  it('recovers once the time window has elapsed', () => {
    const ip = '10.0.0.6';
    for (let i = 0; i < 5; i += 1) checkPublicFormRateLimit('quote', ip);
    expect(checkPublicFormRateLimit('quote', ip)).toBe(true);

    vi.advanceTimersByTime(15 * 60 * 1000 + 1);

    expect(checkPublicFormRateLimit('quote', ip)).toBe(false);
  });

  it('treats a missing IP as its own shared bucket, not as unlimited', () => {
    for (let i = 0; i < 5; i += 1) checkPublicFormRateLimit('quote', null);
    expect(checkPublicFormRateLimit('quote', null)).toBe(true);
  });
});
