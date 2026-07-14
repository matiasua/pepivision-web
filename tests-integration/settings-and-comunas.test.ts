// Covers Fase 9 integration points 23-24: BusinessSettings, EnabledComuna.
// BusinessSettings is a singleton row shared with the real dev
// environment (see modules/business-settings/repository.ts) — this suite
// snapshots whatever is there before mutating it and restores it exactly
// afterward, so it never leaves the developer's real business settings
// altered.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AdminRole } from '@prisma/client';
import { getEffectiveBusinessSettings, updateBusinessSettings } from '@/modules/business-settings/service';
import { createComuna, setComunaActive } from '@/modules/home-visit-coverage/service';
import { createTestAdmin, deleteTestAdmins, prisma, uniqueTag } from './helpers';

describe('modules/business-settings/service — updateBusinessSettings (integration)', () => {
  const adminIds: string[] = [];
  let originalRow: Awaited<ReturnType<typeof prisma.businessSettings.findUnique>> = null;

  beforeAll(async () => {
    originalRow = await prisma.businessSettings.findUnique({ where: { id: 'singleton' } });
  });

  afterAll(async () => {
    if (originalRow) {
      await prisma.businessSettings.update({ where: { id: 'singleton' }, data: originalRow });
    } else {
      await prisma.businessSettings.deleteMany({ where: { id: 'singleton' } });
    }
    await deleteTestAdmins(adminIds);
  });

  it('persists business settings and they are reflected by getEffectiveBusinessSettings', async () => {
    const { user, session } = await createTestAdmin(AdminRole.SUPERADMIN);
    adminIds.push(user.id);
    const tag = uniqueTag('settings');

    const updated = await updateBusinessSettings(
      {
        whatsappNumber: '56911112222',
        phoneDisplay: '+56 9 1111 2222',
        email: `${tag}@integration.test.pepivision360.invalid`,
        instagramHandle: 'pepi_test',
        hoursText: 'Lun a Vie 9:00-18:00',
        locationText: 'Santiago, Chile',
        requestRetentionMonths: 6,
        dataRightsRetentionMonths: 24,
      },
      session
    );
    expect(updated.requestRetentionMonths).toBe(6);

    const effective = await getEffectiveBusinessSettings();
    expect(effective.isPersisted).toBe(true);
    expect(effective.requestRetentionMonths).toBe(6);
    expect(effective.dataRightsRetentionMonths).toBe(24);
    expect(effective.notificationEmail).toBe(effective.email);

    const audit = await prisma.auditLogEntry.findFirst({ where: { action: 'business_settings.updated', adminUserId: user.id } });
    expect(audit).not.toBeNull();
  });
});

describe('modules/home-visit-coverage/service — EnabledComuna (integration)', () => {
  const adminIds: string[] = [];
  const comunaIds: string[] = [];

  afterAll(async () => {
    await prisma.enabledComuna.deleteMany({ where: { id: { in: comunaIds } } });
    await deleteTestAdmins(adminIds);
  });

  it('creates a comuna, rejects a duplicate name, and toggles active state', async () => {
    const { user, session } = await createTestAdmin(AdminRole.ADMIN);
    adminIds.push(user.id);
    const name = uniqueTag('comuna');

    const created = await createComuna({ name, region: 'Región Metropolitana' }, session);
    comunaIds.push(created.id);
    expect(created.active).toBe(true);

    await expect(createComuna({ name, region: 'Región Metropolitana' }, session)).rejects.toThrow();

    const deactivated = await setComunaActive(created.id, false, session);
    expect(deactivated.active).toBe(false);

    const reactivated = await setComunaActive(created.id, true, session);
    expect(reactivated.active).toBe(true);

    const auditActions = await prisma.auditLogEntry.findMany({
      where: { targetId: created.id, targetType: 'EnabledComuna' },
      select: { action: true },
    });
    expect(auditActions.map((a) => a.action)).toEqual(
      expect.arrayContaining(['comuna.created', 'comuna.deactivated', 'comuna.activated'])
    );
  });
});
