import type { AdminRole, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export function findAdminByEmail(email: string) {
  return prisma.adminUser.findUnique({ where: { email } });
}

export function findAdminByUsername(username: string) {
  return prisma.adminUser.findUnique({ where: { username } });
}

/** Login lookup: identifier is already trim+lowercased by loginSchema, matching how both columns are stored. */
export function findAdminByIdentifier(identifier: string) {
  return prisma.adminUser.findFirst({ where: { OR: [{ email: identifier }, { username: identifier }] } });
}

export function findAdminById(id: string) {
  return prisma.adminUser.findUnique({ where: { id } });
}

// Excludes passwordHash: this list is passed to a Client Component
// (UserManager) and Server->Client props are serialized into the page's
// RSC payload, so anything selected here is visible in the browser.
export function listAdminUsers() {
  return prisma.adminUser.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, email: true, username: true, name: true, role: true, active: true },
  });
}

export function countActiveSuperadmins(excludeId?: string) {
  return prisma.adminUser.count({
    where: { role: 'SUPERADMIN', active: true, ...(excludeId ? { id: { not: excludeId } } : {}) },
  });
}

export function createAdminUser(data: {
  email: string;
  username: string;
  name: string;
  passwordHash: string;
  role: AdminRole;
}) {
  return prisma.adminUser.create({ data });
}

export function updateAdminUser(id: string, data: Prisma.AdminUserUpdateInput) {
  return prisma.adminUser.update({ where: { id }, data });
}

export function createSession(data: {
  adminUserId: string;
  tokenHash: string;
  ip: string | null;
  userAgent: string | null;
  expiresAt: Date;
}) {
  return prisma.session.create({ data });
}

export function findSessionByTokenHash(tokenHash: string) {
  return prisma.session.findUnique({ where: { tokenHash }, include: { adminUser: true } });
}

export function touchSession(id: string, expiresAt: Date) {
  return prisma.session.update({ where: { id }, data: { expiresAt } });
}

export function deleteSessionByTokenHash(tokenHash: string) {
  return prisma.session.deleteMany({ where: { tokenHash } });
}

export function createAuditLogEntry(data: {
  adminUserId: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  metadata: Prisma.InputJsonValue | undefined;
  ip: string | null;
}) {
  return prisma.auditLogEntry.create({ data });
}

export function listAuditLogEntries(take = 50) {
  return prisma.auditLogEntry.findMany({
    orderBy: { createdAt: 'desc' },
    take,
    include: { adminUser: { select: { name: true, email: true } } },
  });
}
