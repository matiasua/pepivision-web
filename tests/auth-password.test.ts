import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '@/modules/auth/password';

describe('modules/auth/password', () => {
  it('hashes and verifies a matching password', async () => {
    const hash = await hashPassword('a-very-secure-password');
    expect(hash).not.toBe('a-very-secure-password');
    expect(await verifyPassword('a-very-secure-password', hash)).toBe(true);
  });

  it('rejects a non-matching password', async () => {
    const hash = await hashPassword('a-very-secure-password');
    expect(await verifyPassword('wrong-password', hash)).toBe(false);
  });

  it('produces a different hash each time (random salt)', async () => {
    const hashA = await hashPassword('same-input-password');
    const hashB = await hashPassword('same-input-password');
    expect(hashA).not.toBe(hashB);
  });
});
