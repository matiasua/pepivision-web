import { describe, expect, it } from 'vitest';
import { isRateLimited, recordFailure, resetRateLimit } from '@/lib/rate-limit';

describe('lib/rate-limit', () => {
  it('is not rate limited before any failures', () => {
    expect(isRateLimited('key-a', 5, 60_000)).toBe(false);
  });

  it('blocks once failures reach the max within the window', () => {
    const key = 'key-b';
    for (let i = 0; i < 5; i += 1) recordFailure(key, 60_000);
    expect(isRateLimited(key, 5, 60_000)).toBe(true);
  });

  it('allows one fewer than max', () => {
    const key = 'key-c';
    for (let i = 0; i < 4; i += 1) recordFailure(key, 60_000);
    expect(isRateLimited(key, 5, 60_000)).toBe(false);
  });

  it('resetRateLimit clears the bucket', () => {
    const key = 'key-d';
    for (let i = 0; i < 5; i += 1) recordFailure(key, 60_000);
    expect(isRateLimited(key, 5, 60_000)).toBe(true);
    resetRateLimit(key);
    expect(isRateLimited(key, 5, 60_000)).toBe(false);
  });
});
