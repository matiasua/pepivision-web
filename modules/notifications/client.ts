import nodemailer from 'nodemailer';
import { env } from '@/lib/env';

// Singleton SMTP transport, same rationale as lib/prisma.ts: without this,
// dev-mode hot reload would open a fresh transport on every edit. In this
// environment SMTP_HOST points at the `mailpit` service (no real auth, no
// real recipients); the same code path points at a production SMTP
// provider in production by changing only env vars.
type MailTransport = ReturnType<typeof nodemailer.createTransport>;
const globalForMail = globalThis as unknown as { mailTransport?: MailTransport };

function createTransport(): MailTransport {
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: false,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
  });
}

export const mailTransport = globalForMail.mailTransport ?? createTransport();

if (env.NODE_ENV !== 'production') {
  globalForMail.mailTransport = mailTransport;
}
