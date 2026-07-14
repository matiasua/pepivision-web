// Shared helpers for tests-integration/*.test.ts. Every test in this
// directory runs inside the `web` container against the REAL `postgres`
// and `minio` services from compose.yaml (see vitest.integration.config.ts)
// — no mocked Prisma/S3 client. All fixtures use a unique per-run tag so
// concurrent/-repeated runs never collide, and every test cleans up only
// the exact rows/objects it created (never a pattern-based bulk delete),
// so pre-existing development data (seeded products, comunas, admin
// users, BusinessSettings) is never touched.
import { AdminRole } from '@prisma/client';
import { HeadObjectCommand } from '@aws-sdk/client-s3';
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';
import { hashPassword } from '@/modules/auth/password';
import type { CurrentSession } from '@/modules/auth/service';
import { s3Client } from '@/modules/storage/client';

/** Short, collision-resistant tag for building unique test fixture values (emails, codes, names). */
export function uniqueTag(prefix = 'it'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Creates a real AdminUser row (never a fake/synthetic id) so FK columns
 * that reference admin_users (Product.createdById, AuditLogEntry.adminUserId,
 * BusinessSettings.updatedById, etc.) are always valid. Returns both the
 * row and a ready-to-use CurrentSession-shaped object accepted by every
 * `*Service` function's `actor` parameter — these functions never call
 * `next/headers`'s `cookies()` themselves (only the auth module's own
 * login/logout/getCurrentSession do), so a plain in-memory object is a
 * faithful stand-in, not a mock of any business logic under test.
 */
export async function createTestAdmin(role: AdminRole = AdminRole.ADMIN) {
  const tag = uniqueTag('admin');
  const user = await prisma.adminUser.create({
    data: {
      email: `${tag}@integration.test.pepivision360.invalid`,
      username: tag,
      name: `Test Admin ${tag}`,
      passwordHash: await hashPassword('Integration-Test-Password-1!'),
      role,
      active: true,
    },
  });
  const session: CurrentSession = {
    sessionId: `session_${tag}`,
    adminUser: { id: user.id, email: user.email, name: user.name, role: user.role, active: user.active },
  };
  return { user, session };
}

/** Deletes exactly the AdminUser rows created by createTestAdmin (by id) — never a pattern-based delete. */
export async function deleteTestAdmins(ids: string[]) {
  if (ids.length === 0) return;
  await prisma.session.deleteMany({ where: { adminUserId: { in: ids } } });
  await prisma.auditLogEntry.deleteMany({ where: { adminUserId: { in: ids } } });
  await prisma.adminUser.deleteMany({ where: { id: { in: ids } } });
}

/** Minimal but genuinely decodable 2x2 PNG (verifyAttachmentContent/processProductImage both require real image bytes, not just a magic number). */
export async function tinyPngBuffer(): Promise<Buffer> {
  const sharp = (await import('sharp')).default;
  return sharp({ create: { width: 2, height: 2, channels: 3, background: { r: 200, g: 30, b: 90 } } })
    .png()
    .toBuffer();
}

/** Minimal PDF: verifyAttachmentContent only checks the leading `%PDF` magic number for this type, so a full object graph isn't required. */
export function tinyPdfBuffer(): Buffer {
  return Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF');
}

/** A file that is neither a genuine PDF nor a genuine image — used to prove content-sniffing (not just declared MIME type) is enforced. */
export function bogusExecutableBuffer(): Buffer {
  return Buffer.from('MZ\x90\x00this-is-not-really-a-pdf-or-image');
}

export async function objectExistsInBucket(bucket: string, key: string): Promise<boolean> {
  try {
    await s3Client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (error) {
    const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
    if (status === 404) return false;
    throw error;
  }
}

const MAILPIT_API_BASE = 'http://mailpit:8025/api/v1';

interface MailpitMessageSummary {
  ID: string;
  To: { Address: string }[];
  Subject: string;
}

/** Searches Mailpit's own REST API (never a real SMTP provider) for messages sent to a given address during this test. */
export async function findMailpitMessagesTo(toAddress: string): Promise<MailpitMessageSummary[]> {
  const res = await fetch(`${MAILPIT_API_BASE}/search?query=${encodeURIComponent(`to:${toAddress}`)}`);
  if (!res.ok) throw new Error(`Mailpit search failed: ${res.status}`);
  const body = (await res.json()) as { messages: MailpitMessageSummary[] };
  return body.messages;
}

/** Deletes exactly the given Mailpit message ids — never the mailbox-wide delete-all endpoint, so a developer's own inbox exploration isn't wiped by a test run. */
export async function deleteMailpitMessages(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await fetch(`${MAILPIT_API_BASE}/messages`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ IDs: ids }),
  });
}

export { prisma, env };
