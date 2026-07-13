import { EmailKind, RequestType } from '@prisma/client';
import { ValidationError } from '@/lib/errors';
import { businessDefaults } from '@/lib/business-defaults';
import { computeRetentionExpiresAt } from '@/lib/retention';
import { isHoneypotTriggered } from '@/lib/honeypot';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import { sendAndLog } from '@/modules/notifications/service';
import {
  homeVisitBusinessNotification,
  homeVisitCustomerConfirmation,
  quoteBusinessNotification,
  quoteCustomerConfirmation,
} from '@/modules/notifications/templates';
import { createRequest, findActiveComunaByName, findProductById } from './repository';
import type { HomeVisitRequestInput, QuoteRequestInput } from './schemas';

const TREATMENT_LABELS: Record<string, string> = {
  azul: 'Filtro de luz azul',
  ar: 'Antirreflejo',
  foto: 'Fotocromático',
  uv: 'Protección UV',
  delgado: 'Cristales más delgados',
  raya: 'Resistente a rayaduras',
};

export interface QuoteSubmissionResult {
  customerName: string;
  whatsappHref: string;
}

export async function submitQuote(input: QuoteRequestInput): Promise<QuoteSubmissionResult> {
  const whatsappHref = buildWhatsAppLink(
    `Hola Pepi Visión 360, quiero cotizar mis lentes. Mi nombre es ${input.name}.`
  );

  if (isHoneypotTriggered(input.website)) {
    return { customerName: input.name, whatsappHref };
  }

  let frameProductName: string | null = null;
  if (input.frameChoice === 'catalog' && input.frameProductId) {
    const product = await findProductById(input.frameProductId);
    if (!product) {
      throw new ValidationError('El modelo seleccionado ya no está disponible. Elige otro.');
    }
    frameProductName = `${product.name} (${product.code})`;
  }

  const now = new Date();
  const request = await createRequest({
    type: RequestType.QUOTE,
    name: input.name,
    phone: input.phone,
    email: input.email ?? null,
    comuna: input.comuna ?? null,
    message: input.message ?? null,
    hasPrescription: input.hasPrescription !== 'No estoy seguro' ? input.hasPrescription === 'Sí' : null,
    details: {
      frameChoice: input.frameChoice,
      frameProductId: input.frameProductId ?? null,
      frameProductName,
      glassType: input.glassType,
      treatments: input.treatments,
      treatmentLabels: input.treatments.map((id) => TREATMENT_LABELS[id]),
      prescriptionAnswer: input.hasPrescription,
    },
    consentAcceptedAt: now,
    retentionExpiresAt: computeRetentionExpiresAt(now, businessDefaults.requestRetentionMonths),
  });

  if (input.email) {
    const customerEmail = quoteCustomerConfirmation(input.name);
    await sendAndLog({
      kind: EmailKind.CUSTOMER_CONFIRMATION,
      to: input.email,
      subject: customerEmail.subject,
      text: customerEmail.text,
      requestId: request.id,
    });
  }

  const businessEmail = quoteBusinessNotification({
    requestId: request.id,
    name: input.name,
    phone: input.phone,
    email: input.email ?? null,
    comuna: input.comuna ?? null,
    message: input.message ?? null,
  });
  await sendAndLog({
    kind: EmailKind.BUSINESS_NOTIFICATION,
    to: businessDefaults.notificationEmail,
    subject: businessEmail.subject,
    text: businessEmail.text,
    requestId: request.id,
  });

  return { customerName: input.name, whatsappHref };
}

export interface HomeVisitSubmissionResult {
  customerName: string;
  whatsappHref: string;
  comunaCovered: boolean;
}

export async function submitHomeVisit(input: HomeVisitRequestInput): Promise<HomeVisitSubmissionResult> {
  const whatsappHref = buildWhatsAppLink(
    `Hola Pepi Visión 360, quiero consultar la atención a domicilio para ${input.comuna}. Mi nombre es ${input.name}.`
  );

  const activeComuna = await findActiveComunaByName(input.comuna);
  const comunaCovered = Boolean(activeComuna);

  if (isHoneypotTriggered(input.website)) {
    return { customerName: input.name, whatsappHref, comunaCovered };
  }

  const now = new Date();
  const request = await createRequest({
    type: RequestType.HOME_VISIT,
    name: input.name,
    phone: input.phone,
    email: input.email ?? null,
    comuna: input.comuna,
    message: null,
    hasPrescription: null,
    details: {
      attentionType: input.attentionType ?? null,
      comunaCovered,
    },
    consentAcceptedAt: now,
    retentionExpiresAt: computeRetentionExpiresAt(now, businessDefaults.requestRetentionMonths),
  });

  if (input.email) {
    const customerEmail = homeVisitCustomerConfirmation(input.name);
    await sendAndLog({
      kind: EmailKind.CUSTOMER_CONFIRMATION,
      to: input.email,
      subject: customerEmail.subject,
      text: customerEmail.text,
      requestId: request.id,
    });
  }

  const businessEmail = homeVisitBusinessNotification({
    requestId: request.id,
    name: input.name,
    phone: input.phone,
    email: input.email ?? null,
    comuna: input.comuna,
    attentionType: input.attentionType ?? null,
  });
  await sendAndLog({
    kind: EmailKind.BUSINESS_NOTIFICATION,
    to: businessDefaults.notificationEmail,
    subject: businessEmail.subject,
    text: businessEmail.text,
    requestId: request.id,
  });

  return { customerName: input.name, whatsappHref, comunaCovered };
}
