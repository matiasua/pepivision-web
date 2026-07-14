// Runs once before the whole Playwright run. Provisions dedicated E2E-only
// admin accounts directly via Prisma (never over HTTP, never hardcoded) —
// exactly the same real DB the browser-driven tests hit through nginx.
// Credentials are generated fresh every run (crypto.randomBytes, never a
// fixed value) and written to e2e/.auth/e2e-fixtures.json, which is
// gitignored and deleted again by global-teardown.ts — never checked in,
// never printed to a shared log.
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { AdminRole } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { hashPassword } from '../modules/auth/password';

const FIXTURES_PATH = path.join(__dirname, '.auth', 'e2e-fixtures.json');

function randomPassword(): string {
  return `E2e-${randomBytes(12).toString('hex')}!`;
}

function tag(prefix: string): string {
  return `${prefix}_${randomBytes(4).toString('hex')}`;
}

export default async function globalSetup() {
  const superadminTag = tag('e2e_super');
  const superadminPassword = randomPassword();
  const superadmin = await prisma.adminUser.create({
    data: {
      email: `${superadminTag}@e2e.test.pepivision360.invalid`,
      username: superadminTag,
      name: 'E2E Superadmin',
      passwordHash: await hashPassword(superadminPassword),
      role: AdminRole.SUPERADMIN,
      active: true,
    },
  });

  const adminTag = tag('e2e_admin');
  const adminPassword = randomPassword();
  const admin = await prisma.adminUser.create({
    data: {
      email: `${adminTag}@e2e.test.pepivision360.invalid`,
      username: adminTag,
      name: 'E2E Admin',
      passwordHash: await hashPassword(adminPassword),
      role: AdminRole.ADMIN,
      active: true,
    },
  });

  // A dedicated, uniquely-named enabled comuna so the home-visit "covered"
  // flow doesn't depend on the exact contents of the dev seed data.
  const comunaName = tag('E2E Comuna');
  const comuna = await prisma.enabledComuna.create({ data: { name: comunaName, active: true } });

  await mkdir(path.dirname(FIXTURES_PATH), { recursive: true });
  await writeFile(
    FIXTURES_PATH,
    JSON.stringify(
      {
        superadmin: { id: superadmin.id, email: superadmin.email, username: superadmin.username, password: superadminPassword },
        admin: { id: admin.id, email: admin.email, username: admin.username, password: adminPassword },
        comuna: { id: comuna.id, name: comuna.name },
      },
      null,
      2
    )
  );

  await prisma.$disconnect();
}
