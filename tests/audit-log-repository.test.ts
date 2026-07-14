import { afterEach, describe, expect, it, vi } from 'vitest';

const auditLogEntryCreate = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: { auditLogEntry: { create: (...args: unknown[]) => auditLogEntryCreate(...args) } },
}));

const loggerError = vi.fn();

vi.mock('@/lib/logger', () => ({
  logger: { error: (...args: unknown[]) => loggerError(...args), warn: vi.fn(), info: vi.fn() },
}));

const { createAuditLogEntry } = await import('@/modules/auth/repository');

const entry = {
  adminUserId: 'admin_1',
  action: 'product.updated',
  targetType: 'Product',
  targetId: 'prod_1',
  metadata: undefined,
  ip: '10.0.0.1',
};

describe('modules/auth/repository — createAuditLogEntry (best-effort write)', () => {
  afterEach(() => vi.clearAllMocks());

  it('returns the created row when the write succeeds', async () => {
    auditLogEntryCreate.mockResolvedValue({ id: 'log_1', ...entry });

    const result = await createAuditLogEntry(entry);

    expect(result).toEqual({ id: 'log_1', ...entry });
    expect(loggerError).not.toHaveBeenCalled();
  });

  it('never throws when the write fails — returns null and logs instead', async () => {
    auditLogEntryCreate.mockRejectedValue(new Error('connection reset'));

    await expect(createAuditLogEntry(entry)).resolves.toBeNull();
    expect(loggerError).toHaveBeenCalledWith(
      'audit_log.write_failed',
      expect.objectContaining({ action: 'product.updated', targetType: 'Product', targetId: 'prod_1' })
    );
  });

  it('never logs the actor id, IP, or metadata content on failure (only action/target identifiers)', async () => {
    auditLogEntryCreate.mockRejectedValue(new Error('connection reset'));

    await createAuditLogEntry({ ...entry, metadata: { secret: 'should-not-leak' } });

    const loggedFields = loggerError.mock.calls[0][1];
    expect(loggedFields).not.toHaveProperty('metadata');
    expect(loggedFields).not.toHaveProperty('adminUserId');
    expect(loggedFields).not.toHaveProperty('ip');
    expect(JSON.stringify(loggedFields)).not.toContain('should-not-leak');
  });
});
