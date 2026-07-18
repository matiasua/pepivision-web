'use server';

import { toErrorResponse } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { checkPublicFormRateLimit, PUBLIC_FORM_RATE_LIMIT_MESSAGE } from '@/lib/public-form-rate-limit';
import { getClientIp } from '@/lib/request-ip';
import { quoteRequestSchema } from '@/modules/requests/schemas';
import { submitQuote } from '@/modules/requests/service';
import {
  getQuoteOfferingContext,
  listQuoteCategories,
  listQuoteOfferingsForCategory,
  type QuoteCategoryOption,
  type QuoteOfferingContext,
  type QuoteOfferingOption,
} from '@/modules/requests/quote-wizard-service';

export type QuoteActionState =
  | { status: 'idle' }
  | { status: 'error'; fieldErrors: Record<string, string>; formError?: string }
  | { status: 'success'; customerName: string; whatsappHref: string };

export async function submitQuoteAction(input: unknown, formData: FormData): Promise<QuoteActionState> {
  const ip = await getClientIp();
  if (checkPublicFormRateLimit('quote', ip)) {
    return { status: 'error', fieldErrors: {}, formError: PUBLIC_FORM_RATE_LIMIT_MESSAGE };
  }

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

export type QuoteCategoriesResult = { status: 'ok'; categories: QuoteCategoryOption[] } | { status: 'error' };

/** Fase 10: el wizard consulta esto al montar (o al pedir "cambiar de categoría") — nunca hardcodeado en el cliente. */
export async function getQuoteCategoriesAction(): Promise<QuoteCategoriesResult> {
  try {
    const categories = await listQuoteCategories();
    return { status: 'ok', categories };
  } catch (error) {
    logger.error('quote.categories_load_failed', { error: error instanceof Error ? error.message : String(error) });
    return { status: 'error' };
  }
}

export type QuoteOfferingsResult = { status: 'ok'; offerings: QuoteOfferingOption[] } | { status: 'error' };

/** Lista de modelos disponibles dentro de la categoría ya elegida — nunca la lista plana de todos los productos. */
export async function getQuoteOfferingsForCategoryAction(categoryId: string): Promise<QuoteOfferingsResult> {
  try {
    const offerings = await listQuoteOfferingsForCategory(categoryId);
    return { status: 'ok', offerings };
  } catch (error) {
    logger.error('quote.offerings_load_failed', { error: error instanceof Error ? error.message : String(error) });
    return { status: 'error' };
  }
}

export type QuoteOfferingContextResult =
  | { status: 'ok'; context: QuoteOfferingContext }
  | { status: 'not_found' }
  | { status: 'error' };

/**
 * Fase 10: resuelve el contexto completo de una oferta (categoría,
 * producto, colores, opciones efectivas) server-side — el cliente nunca
 * calcula esto por su cuenta, solo lo consume para renderizar los pasos
 * siguientes del wizard. Fail-closed: cualquier duda (oferta/categoría
 * inactiva, mismatch, inexistente) devuelve `not_found`, nunca datos
 * parciales.
 */
export async function getQuoteOfferingContextAction(categoryId: string, offeringId: string): Promise<QuoteOfferingContextResult> {
  try {
    const result = await getQuoteOfferingContext(categoryId, offeringId);
    if (!result.ok) return { status: 'not_found' };
    return { status: 'ok', context: result.data };
  } catch (error) {
    logger.error('quote.offering_context_failed', { error: error instanceof Error ? error.message : String(error) });
    return { status: 'error' };
  }
}
