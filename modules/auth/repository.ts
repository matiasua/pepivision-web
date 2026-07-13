import type { AdminRole, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export function findAdminByEmail(email: string) {
  return prisma.adminUser.findUnique({ where: { email } });
}

export function findAdminById(id: string) {
  return prisma.adminUser.findUnique({ where: { id } });
}

export function listAdminUsers() {
  return prisma.adminUser.findMany({ orderBy: { createdAt: 'asc' } });
}

export function countActiveSuperadmins(excludeId?: string) {
  return prisma.adminUser.count({
    where: { role: 'SUPERADMIN', active: true, ...(excludeId ? { id: { not: excludeId } } : {}) },
  });
}

export function createAdminUser(data: {
  email: string;
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
