'use server';

import { quoteRequestSchema } from '@/modules/requests/schemas';
import { submitQuote } from '@/modules/requests/service';

export type QuoteActionState =
  | { status: 'idle' }
  | { status: 'error'; fieldErrors: Record<string, string>; formError?: string }
  | { status: 'success'; customerName: string; whatsappHref: string };

export async function submitQuoteAction(input: unknown): Promise<QuoteActionState> {
  const parsed = quoteRequestSchema.safeParse(input);

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString() ?? '_form';
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { status: 'error', fieldErrors };
  }

  try {
    const result = await submitQuote(parsed.data);
    return { status: 'success', customerName: result.customerName, whatsappHref: result.whatsappHref };
  } catch (error) {
    return {
      status: 'error',
      fieldErrors: {},
      formError: error instanceof Error ? error.message : 'No pudimos procesar tu solicitud. Intenta nuevamente.',
    };
  }
}
