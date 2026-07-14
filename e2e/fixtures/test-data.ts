import { readFile } from 'node:fs/promises';
import path from 'node:path';

const FIXTURES_PATH = path.join(__dirname, '..', '.auth', 'e2e-fixtures.json');

export interface E2eFixtures {
  superadmin: { id: string; email: string; username: string; password: string };
  admin: { id: string; email: string; username: string; password: string };
  comuna: { id: string; name: string };
}

export async function readE2eFixtures(): Promise<E2eFixtures> {
  const raw = await readFile(FIXTURES_PATH, 'utf-8');
  return JSON.parse(raw) as E2eFixtures;
}

export function uniqueTag(prefix = 'e2e'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
