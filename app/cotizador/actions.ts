'use server';

import { toErrorResponse } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { quoteRequestSchema } from '@/modules/requests/schemas';
import { submitQuote } from '@/modules/requests/service';

export type QuoteActionState =
  | { status: 'idle' }
  | { status: 'error'; fieldErrors: Record<string, string>; formError?: string }
  | { status: 'success'; customerName: string; whatsappHref: string };

export async function submitQuoteAction(input: unknown, formData: FormData): Promise<QuoteActionState> {
  const parsed = quoteRequestSchema.safeParse(input);

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString() ?? '_form';
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { status: 'error', fieldErrors };
  }

  const file = formData.get('prescriptionFile');
  const prescriptionFile =
    file instanceof File && file.size > 0
      ? { buffer: Buffer.from(await file.arrayBuffer()), contentType: file.type, size: file.size, originalFileName: file.name }
      : null;

  try {
    const result = await submitQuote(parsed.data, prescriptionFile);
    return { status: 'success', customerName: result.customerName, whatsappHref: result.whatsappHref };
  } catch (error) {
    // Never forward a raw error message here: a failed prescription upload
    // can throw from Sharp/MinIO/Prisma, none of which should ever reach
    // the visitor's browser. toErrorResponse() only exposes messages from
    // errors explicitly marked `expose` (ValidationError); the real detail
    // goes to the log instead.
    logger.error('quote.submit_failed', { error: error instanceof Error ? error.message : String(error) });
    return { status: 'error', fieldErrors: {}, formError: toErrorResponse(error).message };
  }
}
