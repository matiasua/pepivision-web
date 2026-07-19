import { describe, expect, it } from 'vitest';
import { buildQuoteWhatsAppMessage } from '@/modules/requests/whatsapp-message';

const BASE = {
  customerName: 'Ana',
  categoryName: 'Lentes ópticos',
  frameBrandName: null as string | null,
  frameProductName: null as string | null,
  frameProductColorName: null as string | null,
  glassTypeLabel: null as string | null,
  priceFromSnapshot: null as number | null,
};

describe('modules/requests/whatsapp-message — buildQuoteWhatsAppMessage', () => {
  it('includes the category and the customer name for an advisory flow with no offering', () => {
    const message = buildQuoteWhatsAppMessage(BASE);
    expect(message).toContain('Lentes ópticos');
    expect(message).toContain('Ana');
  });

  it('includes brand, model and color when a catalog offering was chosen', () => {
    const message = buildQuoteWhatsAppMessage({
      ...BASE,
      frameBrandName: 'Vespa',
      frameProductName: 'Aurora',
      frameProductColorName: 'Negro',
    });
    expect(message).toContain('Vespa');
    expect(message).toContain('Aurora');
    expect(message).toContain('en color Negro');
  });

  it('omits brand/model/color entirely for the advisory flow (all null) — never empty parentheses or dashes', () => {
    const message = buildQuoteWhatsAppMessage(BASE);
    expect(message).not.toContain('en color');
    expect(message).not.toMatch(/—\s*—/); // sin dos separadores consecutivos por un segmento vacío
  });

  it('includes the glass type/modality label in parentheses when present', () => {
    const message = buildQuoteWhatsAppMessage({ ...BASE, glassTypeLabel: 'Progresivo' });
    expect(message).toContain('(Progresivo)');
  });

  it('omits the glass type segment entirely when null — never empty parentheses', () => {
    const message = buildQuoteWhatsAppMessage(BASE);
    expect(message).not.toContain('()');
  });

  it('includes the historical price as "Desde $X" (formatClp) when priceFromSnapshot has a value', () => {
    const message = buildQuoteWhatsAppMessage({ ...BASE, priceFromSnapshot: 19990 });
    expect(message).toContain('Desde $19.990');
  });

  it('omits the price segment entirely when priceFromSnapshot is null — never "$0" or a fabricated "Por cotizar"', () => {
    const message = buildQuoteWhatsAppMessage(BASE);
    expect(message).not.toContain('Desde');
    expect(message).not.toContain('$0');
    expect(message).not.toContain('Por cotizar');
  });

  it('builds the full message with every segment present, in a legible order, for a catalog offering with price', () => {
    const message = buildQuoteWhatsAppMessage({
      customerName: 'Ana',
      categoryName: 'Lentes de sol',
      frameBrandName: 'Vespa',
      frameProductName: 'Aurora',
      frameProductColorName: 'Negro',
      glassTypeLabel: 'Solar progresivo',
      priceFromSnapshot: 45000,
    });
    expect(message).toBe(
      'Hola Pepi Visión 360, quiero cotizar Lentes de sol — Vespa Aurora en color Negro (Solar progresivo) — Desde $45.000. Mi nombre es Ana.'
    );
  });

  it('never includes technical identifiers, slugs, storage keys or URLs', () => {
    const message = buildQuoteWhatsAppMessage({
      ...BASE,
      frameBrandName: 'Vespa',
      frameProductName: 'Aurora',
      priceFromSnapshot: 19990,
    });
    for (const forbidden of ['categorySlug', 'offeringId', 'productId', 'storageKey', 'http://', 'https://', 'minio']) {
      expect(message).not.toContain(forbidden);
    }
  });
});
