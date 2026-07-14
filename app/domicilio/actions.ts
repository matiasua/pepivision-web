'use server';

import { checkPublicFormRateLimit, PUBLIC_FORM_RATE_LIMIT_MESSAGE } from '@/lib/public-form-rate-limit';
import { getClientIp } from '@/lib/request-ip';
import { homeVisitRequestSchema } from '@/modules/requests/schemas';
import { submitHomeVisit } from '@/modules/requests/service';

export type HomeVisitActionState =
  | { status: 'idle' }
  | { status: 'error'; fieldErrors: Record<string, string>; formError?: string }
  | { status: 'success'; customerName: string; whatsappHref: string; comunaCovered: boolean };

export async function submitHomeVisitAction(input: unknown): Promise<HomeVisitActionState> {
  const ip = await getClientIp();
  if (checkPublicFormRateLimit('home_visit', ip)) {
    return { status: 'error', fieldErrors: {}, formError: PUBLIC_FORM_RATE_LIMIT_MESSAGE };
  }

  const parsed = homeVisitRequestSchema.safeParse(input);

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString() ?? '_form';
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { status: 'error', fieldErrors };
  }

  try {
    const result = await submitHomeVisit(parsed.data);
    return {
      status: 'success',
      customerName: result.customerName,
      whatsappHref: result.whatsappHref,
      comunaCovered: result.comunaCovered,
    };
  } catch (error) {
    return {
      status: 'error',
      fieldErrors: {},
      formError: error instanceof Error ? error.message : 'No pudimos procesar tu consulta. Intenta nuevamente.',
    };
  }
}
