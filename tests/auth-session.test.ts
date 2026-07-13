import { describe, expect, it } from 'vitest';
import { generateSessionToken, hashSessionToken } from '@/modules/auth/session';

describe('modules/auth/session', () => {
  it('generates high-entropy, unique tokens', () => {
    const a = generateSessionToken();
    const b = generateSessionToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(32);
  });

  it('hashes deterministically (same input -> same hash)', () => {
    const token = generateSessionToken();
    expect(hashSessionToken(token)).toBe(hashSessionToken(token));
  });

  it('produces different hashes for different tokens', () => {
    expect(hashSessionToken(generateSessionToken())).not.toBe(hashSessionToken(generateSessionToken()));
  });

  it('never returns the raw token as its own hash', () => {
    const token = generateSessionToken();
    expect(hashSessionToken(token)).not.toBe(token);
  });
});
