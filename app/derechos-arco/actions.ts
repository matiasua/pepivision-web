'use server';

import { dataRightsRequestSchema } from '@/modules/data-rights/schemas';
import { submitDataRightsRequest } from '@/modules/data-rights/service';

export type DataRightsActionState =
  | { status: 'idle' }
  | { status: 'error'; fieldErrors: Record<string, string>; formError?: string }
  | { status: 'success'; customerName: string };

export async function submitDataRightsAction(input: unknown): Promise<DataRightsActionState> {
  const parsed = dataRightsRequestSchema.safeParse(input);

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString() ?? '_form';
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { status: 'error', fieldErrors };
  }

  try {
    const result = await submitDataRightsRequest(parsed.data);
    return { status: 'success', customerName: result.customerName };
  } catch (error) {
    return {
      status: 'error',
      fieldErrors: {},
      formError: error instanceof Error ? error.message : 'No pudimos procesar tu solicitud. Intenta nuevamente.',
    };
  }
}
