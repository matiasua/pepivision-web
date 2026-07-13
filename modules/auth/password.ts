import bcrypt from 'bcryptjs';

// bcrypt (via bcryptjs, a pure-JS implementation — see design.md for why,
// not the native `argon2`/`bcrypt` packages) instead of the mockup's
// hardcoded plaintext admin/pepi360 credentials.
const SALT_ROUNDS = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
