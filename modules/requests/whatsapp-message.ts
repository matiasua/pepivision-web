// Fase 13 (redesign-extensible-catalog-v2 — emails y WhatsApp consumiendo
// el snapshot): único constructor del texto comercial del mensaje de
// WhatsApp de una cotización. Módulo puro (sin Prisma, sin I/O) para que
// pueda probarse de forma unitaria sin arrastrar toda la cadena de
// dependencias de modules/requests/service.ts — mismo patrón que
// modules/catalog/dynamic-filters.ts.
import { formatClp } from '@/modules/catalog/labels';

export interface QuoteWhatsAppMessageInput {
  customerName: string;
  categoryName: string;
  frameBrandName: string | null;
  frameProductName: string | null;
  frameProductColorName: string | null;
  glassTypeLabel: string | null;
  /** Mismo valor histórico que ve el snapshot y ambos correos — nunca recalculado, nunca `Product.priceFromClp`. */
  priceFromSnapshot: number | null;
}

/**
 * Solo labels ya resueltos server-side — nunca categorySlug, offeringId,
 * productId, storageKey ni datos de receta. Cada segmento se omite por
 * completo cuando no aplica, nunca deja un label vacío ("Desde $0",
 * paréntesis vacíos, etc.).
 */
export function buildQuoteWhatsAppMessage(input: QuoteWhatsAppMessageInput): string {
  const parts: string[] = [input.categoryName];

  if (input.frameProductName) {
    const brandPrefix = input.frameBrandName ? `${input.frameBrandName} ` : '';
    const colorSuffix = input.frameProductColorName ? ` en color ${input.frameProductColorName}` : '';
    parts.push(`— ${brandPrefix}${input.frameProductName}${colorSuffix}`);
  }

  if (input.glassTypeLabel) {
    parts.push(`(${input.glassTypeLabel})`);
  }

  if (input.priceFromSnapshot !== null) {
    parts.push(`— Desde ${formatClp(input.priceFromSnapshot)}`);
  }

  return `Hola Pepi Visión 360, quiero cotizar ${parts.join(' ')}. Mi nombre es ${input.customerName}.`;
}
