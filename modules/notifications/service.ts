import { EmailKind, EmailStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { env } from '@/lib/env';
import { mailTransport } from './client';

interface SendEmailInput {
  kind: EmailKind;
  to: string;
  subject: string;
  text: string;
  /** Always sent alongside `text` — Nodemailer delivers both parts in the same message; text is the fallback, never replaced. */
  html: string;
  /**
   * Where a reply should land — never the no-reply SMTP_FROM address.
   * Customer-facing emails set this to the business's real contact
   * address; business-facing emails set it to the customer's address
   * (when known) so a plain "Reply" goes straight to them. Omitted
   * entirely when there's nowhere sensible to reply to.
   */
  replyTo?: string;
  requestId?: string;
  dataRightsRequestId?: string;
}

const SENDER_DISPLAY_NAME = 'Pepi Visión 360';

/**
 * Sends an email and always records the attempt in `EmailLog`, success or
 * failure. Never throws: a delivery failure must not undo the `Request`/
 * `DataRightsRequest` row already persisted by the caller (see
 * specs/quote-requests, specs/home-visit-requests, specs/data-rights-requests
 * — "falla de envío no bloquea la solicitud").
 *
 * Deliverability/anti-spam posture (see modules/notifications/README.md
 * for the production DNS side — SPF/DKIM/DMARC — that this code alone
 * can't provide): a real display name (not a bare address), a Reply-To
 * that's never the no-reply sender, and RFC 3834 `Auto-Submitted` +
 * `X-Auto-Response-Suppress` headers so receiving systems don't bounce an
 * autoresponder back at us — all standard signals mailbox providers use
 * to distinguish legitimate transactional mail from spam.
 */
export async function sendAndLog(input: SendEmailInput): Promise<void> {
  try {
    const info = await mailTransport.sendMail({
      from: { name: SENDER_DISPLAY_NAME, address: env.SMTP_FROM },
      to: input.to,
      replyTo: input.replyTo,
      subject: input.subject,
      text: input.text,
      html: input.html,
      headers: {
        'Auto-Submitted': 'auto-generated',
        'X-Auto-Response-Suppress': 'All',
      },
    });

    await prisma.emailLog.create({
      data: {
        requestId: input.requestId,
        dataRightsRequestId: input.dataRightsRequestId,
        kind: input.kind,
        toAddress: input.to,
        status: EmailStatus.SENT,
        providerMessageId: info.messageId ?? null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido al enviar el correo';

    // Deliberately omit `to`/`subject`/`text` from the structured log —
    // only enough context to correlate with the EmailLog row, no PII.
    logger.error('email.send_failed', {
      kind: input.kind,
      requestId: input.requestId,
      dataRightsRequestId: input.dataRightsRequestId,
    });

    await prisma.emailLog.create({
      data: {
        requestId: input.requestId,
        dataRightsRequestId: input.dataRightsRequestId,
        kind: input.kind,
        toAddress: input.to,
        status: EmailStatus.FAILED,
        error: message,
      },
    });
  }
}
