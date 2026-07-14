// Deletes exactly the rows global-setup.ts created (by id — never a
// pattern-based bulk delete) and removes the credentials file. Runs even
// if tests fail, so a crashed run never leaves E2E-only accounts behind in
// a shared dev database.
import { readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '../lib/prisma';

const FIXTURES_PATH = path.join(__dirname, '.auth', 'e2e-fixtures.json');

export default async function globalTeardown() {
  try {
    const raw = await readFile(FIXTURES_PATH, 'utf-8');
    const fixtures = JSON.parse(raw) as {
      superadmin: { id: string };
      admin: { id: string };
      comuna: { id: string };
    };

    const adminIds = [fixtures.superadmin.id, fixtures.admin.id];
    await prisma.session.deleteMany({ where: { adminUserId: { in: adminIds } } });
    await prisma.auditLogEntry.deleteMany({ where: { adminUserId: { in: adminIds } } });
    await prisma.adminUser.deleteMany({ where: { id: { in: adminIds } } });
    await prisma.enabledComuna.deleteMany({ where: { id: fixtures.comuna.id } });
  } catch (error) {
    // If setup never ran (or the file is already gone), there's nothing to
    // clean up — never throw and mask the real test results.
    console.warn('e2e global-teardown: nothing to clean up or fixtures file unreadable:', error);
  } finally {
    await prisma.$disconnect();
    await rm(FIXTURES_PATH, { force: true });
  }
}
