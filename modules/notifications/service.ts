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
  requestId?: string;
  dataRightsRequestId?: string;
}

/**
 * Sends an email and always records the attempt in `EmailLog`, success or
 * failure. Never throws: a delivery failure must not undo the `Request`/
 * `DataRightsRequest` row already persisted by the caller (see
 * specs/quote-requests, specs/home-visit-requests, specs/data-rights-requests
 * — "falla de envío no bloquea la solicitud").
 */
export async function sendAndLog(input: SendEmailInput): Promise<void> {
  try {
    const info = await mailTransport.sendMail({
      from: env.SMTP_FROM,
      to: input.to,
      subject: input.subject,
      text: input.text,
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
