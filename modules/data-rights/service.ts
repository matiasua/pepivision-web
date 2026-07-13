import { DataRightType, EmailKind } from '@prisma/client';
import { computeRetentionExpiresAt } from '@/lib/retention';
import { isHoneypotTriggered } from '@/lib/honeypot';
import { getEffectiveBusinessSettings } from '@/modules/business-settings/service';
import { sendAndLog } from '@/modules/notifications/service';
import { dataRightsBusinessNotification } from '@/modules/notifications/templates';
import { createDataRightsRequest } from './repository';
import { RIGHT_TYPES, type DataRightsRequestInput } from './schemas';

export interface DataRightsSubmissionResult {
  customerName: string;
}

export async function submitDataRightsRequest(
  input: DataRightsRequestInput
): Promise<DataRightsSubmissionResult> {
  if (isHoneypotTriggered(input.website)) {
    return { customerName: input.name };
  }

  const settings = await getEffectiveBusinessSettings();
  const now = new Date();
  const request = await createDataRightsRequest({
    rightType: DataRightType[input.rightType],
    name: input.name,
    email: input.email,
    phone: input.phone ?? null,
    description: input.description,
    consentAcceptedAt: now,
    retentionExpiresAt: computeRetentionExpiresAt(now, settings.dataRightsRetentionMonths),
  });

  const businessEmail = dataRightsBusinessNotification({
    requestId: request.id,
    rightTypeLabel: RIGHT_TYPES[input.rightType],
    name: input.name,
    email: input.email,
    phone: input.phone ?? null,
    description: input.description,
  });
  await sendAndLog({
    kind: EmailKind.DATA_RIGHTS_NOTIFICATION,
    to: settings.notificationEmail,
    subject: businessEmail.subject,
    text: businessEmail.text,
    dataRightsRequestId: request.id,
  });

  return { customerName: input.name };
}
