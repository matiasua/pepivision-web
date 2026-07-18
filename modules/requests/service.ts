import { EmailKind, RequestAttachmentType, RequestType } from '@prisma/client';
import { ValidationError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { computeRetentionExpiresAt } from '@/lib/retention';
import { isHoneypotTriggered } from '@/lib/honeypot';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import { sanitizeAttachmentFileName, verifyAttachmentContent } from '@/lib/attachment-processing';
import { findCategoryById } from '@/modules/catalog/category-repository';
import { parseCategoryCapabilities } from '@/modules/catalog/category-capabilities';
import { isReservedLegacyCategorySlug } from '@/modules/catalog/legacy-slugs';
import {
  getAdditionalOptionLabel,
  getLensModalityLabel,
  getTreatmentLabel,
  isAdditionalOptionSelectable,
  isLensModalitySelectable,
  isTreatmentSelectable,
  requiresPrescription,
  resolveCategoryQuoteOptions,
  type LensModalityId,
  type QuoteOptions,
} from '@/modules/catalog/quote-options';
import { attachmentFileMetaSchema } from '@/modules/storage/schemas';
import { buildAttachmentStorageKey, deletePrivateObject, uploadPrivateObject } from '@/modules/storage/private-service';
import { getEffectiveBusinessSettings } from '@/modules/business-settings/service';
import { sendAndLog } from '@/modules/notifications/service';
import {
  homeVisitBusinessNotification,
  homeVisitCustomerConfirmation,
  quoteBusinessNotification,
  quoteCustomerConfirmation,
} from '@/modules/notifications/templates';
import { createRequest, findActiveComunaByName } from './repository';
import { getQuoteOfferingContext } from './quote-wizard-service';
import type { HomeVisitRequestInput, QuoteRequestInput } from './schemas';

export interface PrescriptionFileInput {
  buffer: Buffer;
  contentType: string;
  size: number;
  originalFileName: string;
}

export interface QuoteSubmissionResult {
  customerName: string;
  whatsappHref: string;
}

export async function submitQuote(
  input: QuoteRequestInput,
  prescriptionFile: PrescriptionFileInput | null
): Promise<QuoteSubmissionResult> {
  // Resolved server-side below once we know the chosen color (if any) —
  // the honeypot short-circuit further down needs *a* href even without
  // resolving anything, so start with the generic message.
  let whatsappHref = buildWhatsAppLink(
    `Hola Pepi Visión 360, quiero cotizar mis lentes. Mi nombre es ${input.name}.`
  );

  if (isHoneypotTriggered(input.website)) {
    return { customerName: input.name, whatsappHref };
  }

  // Fase 10 (cotizador configurable): re-resuelve la categoría server-side
  // — nunca confía en el estado React ni en un capability/allowlist
  // reclamado por el cliente. La oferta/producto/color se resuelven más
  // abajo, una vez conocida la categoría.
  const category = await findCategoryById(input.categoryId);
  if (!category || !category.active || !category.visible || isReservedLegacyCategorySlug(category.slug)) {
    throw new ValidationError('La categoría seleccionada ya no está disponible.');
  }
  const capabilities = parseCategoryCapabilities(category.capabilities);

  // Step 2 of the transactional flow (design.md → "Adjuntos de
  // solicitudes"): validate the file's declared meta AND its actual
  // content up front — pure, no I/O side effects yet — so an invalid file
  // fails before *anything* else (including the product/color lookup
  // below) ever runs. The actual upload (steps 3–4) happens further down,
  // right before persisting, to keep the window between "object exists in
  // the bucket" and "Request row exists" as small as possible.
  if (prescriptionFile) {
    const meta = attachmentFileMetaSchema.safeParse({ type: prescriptionFile.contentType, size: prescriptionFile.size });
    if (!meta.success) {
      throw new ValidationError(meta.error.issues[0]?.message ?? 'Archivo inválido.');
    }

    const contentIsGenuine = await verifyAttachmentContent(prescriptionFile.buffer, prescriptionFile.contentType);
    if (!contentIsGenuine) {
      throw new ValidationError(
        'No se pudo procesar el archivo. Verifica que no esté dañado y que corresponda al formato indicado.'
      );
    }
  }

  let frameProductName: string | null = null;
  // Distinct from frameProductName (which stays "Aurora (PV-101)" for
  // Request.details/WhatsApp compatibility, unchanged) — these two exist
  // only so the email templates can show "Modelo" and "Código" as separate
  // rows instead of one concatenated string.
  let frameProductDisplayName: string | null = null;
  let frameProductCode: string | null = null;
  let frameProductColorId: string | null = null;
  let frameProductColorName: string | null = null;
  let frameProductColorHex: string | null = null;
  let frameBrandId: string | null = null;
  let frameBrandName: string | null = null;
  let frameBrandSlug: string | null = null;
  let frameProductId: string | null = null;
  let offeringId: string | null = null;
  let priceFromSnapshot: number | null = null;
  // Sin oferta (ruta de asesoría): la allowlist efectiva es la de la
  // categoría sola — una oferta puntual solo puede restringirla más, nunca
  // ampliarla (getQuoteOfferingContext ya aplica esa intersección).
  let effectiveOptions: QuoteOptions = resolveCategoryQuoteOptions(capabilities.quoteOptions);

  if (input.frameChoice === 'catalog') {
    if (!input.offeringId) {
      throw new ValidationError('Selecciona un modelo del catálogo.');
    }
    const offeringContext = await getQuoteOfferingContext(category.id, input.offeringId);
    if (!offeringContext.ok) {
      throw new ValidationError('El modelo u oferta seleccionados ya no están disponibles.');
    }
    const context = offeringContext.data;
    offeringId = context.offeringId;
    frameProductId = context.product.id;
    frameProductName = `${context.product.name} (${context.product.code})`;
    frameProductDisplayName = context.product.name;
    frameProductCode = context.product.code;
    // Brand, like color below, is always resolved from PostgreSQL here —
    // never trusted from anything the browser might have sent.
    frameBrandId = context.brand?.id ?? null;
    frameBrandName = context.brand?.name ?? null;
    frameBrandSlug = context.brand?.slug ?? null;
    priceFromSnapshot = context.priceFromClp;
    effectiveOptions = context.effectiveOptions;

    if (capabilities.requiresColor) {
      // The color's real name/hex always come from this lookup, never from
      // whatever the client happened to send — the id only selects *which*
      // row to read, and that row must belong to this exact product.
      const color = context.product.colors.find((c) => c.id === input.frameProductColorId);
      if (!color) {
        throw new ValidationError('Selecciona un color válido para este modelo.');
      }
      frameProductColorId = color.id;
      frameProductColorName = color.name;
      frameProductColorHex = color.hex;
    }

    const brandPrefix = frameBrandName ? `${frameBrandName} ` : '';
    const colorSuffix = frameProductColorName ? ` en color ${frameProductColorName}` : '';
    whatsappHref = buildWhatsAppLink(
      `Hola Pepi Visión 360, quiero cotizar el modelo ${brandPrefix}${frameProductName}${colorSuffix}. Mi nombre es ${input.name}.`
    );
  }

  // Fase 9 (motor de compatibilidades): valida tipo de cristal/modalidad,
  // tratamientos y opciones adicionales contra la allowlist EFECTIVA ya
  // resuelta arriba (categoría ∩ exclusiones de la oferta) — única fuente
  // de verdad, nunca una segunda matriz en este archivo. Un campo
  // condicionado a una capability que la categoría no otorga simplemente
  // se ignora (nunca se valida, nunca se persiste, nunca se envía).
  let lensModalityLabel: string | null = null;
  let treatmentIdsToStore: string[] = [];
  let treatmentLabels: string[] = [];
  let additionalOptionIdsToStore: string[] = [];
  let additionalOptionLabels: string[] = [];
  let prescriptionStepActive = false;

  if (capabilities.allowsLensType) {
    if (!input.lensModality || !isLensModalitySelectable(effectiveOptions, input.lensModality)) {
      throw new ValidationError('Selecciona un tipo de cristal válido para esta categoría.');
    }
    lensModalityLabel = getLensModalityLabel(input.lensModality);
    prescriptionStepActive = capabilities.allowsPrescription && requiresPrescription(input.lensModality as LensModalityId);
  } else {
    prescriptionStepActive = capabilities.allowsPrescription;
  }

  if (capabilities.allowsTreatments) {
    if (new Set(input.treatments).size !== input.treatments.length) {
      throw new ValidationError('Hay tratamientos duplicados en la selección.');
    }
    for (const id of input.treatments) {
      if (!isTreatmentSelectable(effectiveOptions, id)) {
        throw new ValidationError('Uno de los tratamientos seleccionados no está disponible para esta categoría.');
      }
    }
    treatmentIdsToStore = [...input.treatments];
    treatmentLabels = treatmentIdsToStore.map((id) => getTreatmentLabel(id)).filter((label): label is string => label !== null);

    if (new Set(input.additionalOptions).size !== input.additionalOptions.length) {
      throw new ValidationError('Hay opciones adicionales duplicadas en la selección.');
    }
    for (const id of input.additionalOptions) {
      if (!isAdditionalOptionSelectable(effectiveOptions, id)) {
        throw new ValidationError('Una de las opciones adicionales seleccionadas no está disponible para esta categoría.');
      }
    }
    additionalOptionIdsToStore = [...input.additionalOptions];
    additionalOptionLabels = additionalOptionIdsToStore
      .map((id) => getAdditionalOptionLabel(id))
      .filter((label): label is string => label !== null);
  }

  if (prescriptionStepActive && !input.hasPrescription) {
    throw new ValidationError('Indica si cuentas con una receta óptica vigente.');
  }
  const prescriptionAnswer = prescriptionStepActive ? (input.hasPrescription ?? null) : null;

  // Un adjunto de receta solo es válido cuando la categoría otorga AMBAS
  // capabilities y la respuesta de receta activa es "Sí" — un archivo
  // enviado fuera de esas condiciones nunca se sube ni se persiste (ver
  // Fase 7: "prescriptionAttachment solo tiene efecto cuando
  // allowsPrescription también es true").
  const prescriptionAttachmentAllowed =
    prescriptionStepActive && capabilities.allowsPrescriptionAttachment && prescriptionAnswer === 'Sí';
  if (!prescriptionAttachmentAllowed) {
    prescriptionFile = null;
  }

  // Steps 3–4: generate the storage key and upload only now, right before
  // persisting — validation already passed, and the product/color lookup
  // above already had its chance to reject the request for unrelated
  // reasons without ever touching the bucket.
  let attachmentToCreate:
    | { type: RequestAttachmentType; storageKey: string; originalFileName: string; mimeType: string; sizeBytes: number }
    | null = null;

  if (prescriptionFile) {
    const extension = prescriptionFile.contentType === 'application/pdf' ? 'pdf' : prescriptionFile.contentType.split('/')[1];
    const storageKey = buildAttachmentStorageKey(extension);
    try {
      await uploadPrivateObject({ key: storageKey, body: prescriptionFile.buffer, contentType: prescriptionFile.contentType });
    } catch (error) {
      logger.error('quote.prescription_upload_failed', { error: error instanceof Error ? error.message : String(error) });
      throw new ValidationError('No se pudo subir la receta. Intenta nuevamente.');
    }

    attachmentToCreate = {
      type: RequestAttachmentType.PRESCRIPTION,
      storageKey,
      originalFileName: sanitizeAttachmentFileName(prescriptionFile.originalFileName),
      mimeType: prescriptionFile.contentType,
      sizeBytes: prescriptionFile.size,
    };
  }

  const settings = await getEffectiveBusinessSettings();
  const now = new Date();

  // Step 5, with step 6's compensating rollback: if the Request (and its
  // nested RequestAttachment) fails to persist, the only cleanup needed is
  // the object we just uploaded — nothing else was written yet.
  let request;
  try {
    request = await createRequest({
      type: RequestType.QUOTE,
      name: input.name,
      phone: input.phone,
      email: input.email ?? null,
      comuna: input.comuna ?? null,
      message: input.message ?? null,
      hasPrescription: prescriptionAnswer !== null && prescriptionAnswer !== 'No estoy seguro' ? prescriptionAnswer === 'Sí' : null,
      details: {
        // Fase 10: campos de categoría/oferta, additivos — nunca leídos
        // por RequestCard.tsx ni los templates de correo todavía (eso
        // llega en una fase posterior), pero ya quedan persistidos como
        // snapshot temporal inmutable de esta solicitud (ver design.md →
        // "Precios y cotizador configurable"; el snapshot histórico
        // definitivo pertenece a la Fase 11, no reimplementado aquí).
        categoryId: category.id,
        categoryName: category.name,
        categorySlug: category.slug,
        offeringId,
        priceFromSnapshot,
        frameChoice: input.frameChoice,
        frameProductId,
        frameProductName,
        frameProductColorId,
        frameProductColorName,
        frameProductColorHex,
        frameBrandId,
        frameBrandName,
        frameBrandSlug,
        glassType: lensModalityLabel,
        treatments: treatmentIdsToStore,
        treatmentLabels,
        additionalOptions: additionalOptionIdsToStore,
        additionalOptionLabels,
        prescriptionAnswer,
      },
      consentAcceptedAt: now,
      retentionExpiresAt: computeRetentionExpiresAt(now, settings.requestRetentionMonths),
      attachment: attachmentToCreate ?? undefined,
    });
  } catch (error) {
    if (attachmentToCreate) {
      await deletePrivateObject(attachmentToCreate.storageKey).catch((cleanupError) => {
        logger.error('quote.prescription_orphan_cleanup_failed', {
          error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
        });
      });
    }
    logger.error('quote.create_request_failed', { error: error instanceof Error ? error.message : String(error) });
    throw new ValidationError('No pudimos guardar tu solicitud. Intenta nuevamente.');
  }

  // Step 7 (notifications) + step 8 (EmailLog, inside sendAndLog) only
  // ever run after the Request is safely persisted.
  const contact = {
    phoneDisplay: settings.phoneDisplay,
    email: settings.email,
    instagramHandle: settings.instagramHandle,
    hoursText: settings.hoursText,
    locationText: settings.locationText,
  };
  if (input.email) {
    const customerEmail = quoteCustomerConfirmation({
      requestId: request.id,
      name: input.name,
      frameBrandName,
      frameProductName: frameProductDisplayName,
      frameProductCode,
      frameProductColorName,
      glassType: lensModalityLabel ?? '—',
      treatmentLabels,
      prescriptionAnswer: prescriptionAnswer ?? '—',
      hasPrescriptionAttachment: Boolean(attachmentToCreate),
      comuna: input.comuna ?? null,
      message: input.message ?? null,
      whatsappHref,
      createdAt: now,
      contact,
    });
    await sendAndLog({
      kind: EmailKind.CUSTOMER_CONFIRMATION,
      to: input.email,
      // Never the no-reply SMTP_FROM address — a customer hitting "Reply"
      // should land in the business's real, monitored inbox.
      replyTo: settings.email,
      subject: customerEmail.subject,
      text: customerEmail.text,
      html: customerEmail.html,
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
    frameBrandName,
    frameProductName: frameProductDisplayName,
    frameProductCode,
    frameProductColorName,
    glassType: lensModalityLabel ?? '—',
    treatmentLabels,
    prescriptionAnswer: prescriptionAnswer ?? '—',
    // Never the file itself, its storageKey, or any other detail — just a
    // pointer to go look at it in the authenticated admin panel.
    hasPrescriptionAttachment: Boolean(attachmentToCreate),
    createdAt: now,
    contact,
  });
  await sendAndLog({
    kind: EmailKind.BUSINESS_NOTIFICATION,
    to: settings.notificationEmail,
    // So the business can hit "Reply" and write straight back to the
    // customer, when we have an address for them.
    replyTo: input.email ?? undefined,
    subject: businessEmail.subject,
    text: businessEmail.text,
    html: businessEmail.html,
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

  const settings = await getEffectiveBusinessSettings();
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
    retentionExpiresAt: computeRetentionExpiresAt(now, settings.requestRetentionMonths),
  });

  const contact = {
    phoneDisplay: settings.phoneDisplay,
    email: settings.email,
    instagramHandle: settings.instagramHandle,
    hoursText: settings.hoursText,
    locationText: settings.locationText,
  };

  if (input.email) {
    const customerEmail = homeVisitCustomerConfirmation({
      requestId: request.id,
      name: input.name,
      comuna: input.comuna,
      attentionType: input.attentionType ?? null,
      comunaCovered,
      createdAt: now,
      contact,
    });
    await sendAndLog({
      kind: EmailKind.CUSTOMER_CONFIRMATION,
      to: input.email,
      replyTo: settings.email,
      subject: customerEmail.subject,
      text: customerEmail.text,
      html: customerEmail.html,
      requestId: request.id,
    });
  }

  const businessEmail = homeVisitBusinessNotification({
    requestId: request.id,
    name: input.name,
    phone: input.phone,
    email: input.email ?? null,
    comuna: input.comuna,
    comunaCovered,
    attentionType: input.attentionType ?? null,
    createdAt: now,
    contact,
  });
  await sendAndLog({
    kind: EmailKind.BUSINESS_NOTIFICATION,
    to: settings.notificationEmail,
    replyTo: input.email ?? undefined,
    subject: businessEmail.subject,
    text: businessEmail.text,
    html: businessEmail.html,
    requestId: request.id,
  });

  return { customerName: input.name, whatsappHref, comunaCovered };
}
