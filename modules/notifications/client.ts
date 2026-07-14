import nodemailer from 'nodemailer';
import { env } from '@/lib/env';

// Singleton SMTP transport, same rationale as lib/prisma.ts: without this,
// dev-mode hot reload would open a fresh transport on every edit. In this
// environment SMTP_HOST points at the `mailpit` service (no real auth, no
// real recipients); the same code path points at a production SMTP
// provider in production by changing only env vars.
type MailTransport = ReturnType<typeof nodemailer.createTransport>;
const globalForMail = globalThis as unknown as { mailTransport?: MailTransport };

/**
 * DKIM only activates once all three pieces are configured together — see
 * lib/env.ts. Returns undefined (nodemailer's default: no signing) in
 * development against Mailpit, which doesn't check signatures anyway.
 * Takes plain args (not the `env` singleton) so it's a pure, directly
 * testable function.
 */
export function buildDkimConfig(domainName: string, keySelector: string, privateKey: string) {
  if (!domainName || !keySelector || !privateKey) return undefined;
  return { domainName, keySelector, privateKey };
}

function createTransport(): MailTransport {
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    requireTLS: env.SMTP_REQUIRE_TLS,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
    dkim: buildDkimConfig(env.DKIM_DOMAIN_NAME, env.DKIM_KEY_SELECTOR, env.DKIM_PRIVATE_KEY),
  });
}

export const mailTransport = globalForMail.mailTransport ?? createTransport();

if (env.NODE_ENV !== 'production') {
  globalForMail.mailTransport = mailTransport;
}
