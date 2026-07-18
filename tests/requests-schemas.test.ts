import { describe, expect, it } from 'vitest';
import { homeVisitRequestSchema, quoteRequestSchema } from '@/modules/requests/schemas';

const CATEGORY_ID = 'clx000000000000000000cat';

const baseQuote = {
  categoryId: CATEGORY_ID,
  frameChoice: 'advice' as const,
  treatments: [],
  additionalOptions: [],
  name: 'Juana Pérez',
  phone: '+56 9 1234 5678',
  consent: true,
};

describe('modules/requests/schemas — quoteRequestSchema', () => {
  it('accepts a valid submission requesting advice (no offering needed)', () => {
    const result = quoteRequestSchema.safeParse(baseQuote);
    expect(result.success).toBe(true);
  });

  it('requires categoryId', () => {
    const withoutCategory: Record<string, unknown> = { ...baseQuote };
    delete withoutCategory.categoryId;
    const result = quoteRequestSchema.safeParse(withoutCategory);
    expect(result.success).toBe(false);
  });

  it('requires offeringId when frameChoice is catalog', () => {
    const result = quoteRequestSchema.safeParse({ ...baseQuote, frameChoice: 'catalog' });
    expect(result.success).toBe(false);
  });

  it('requires frameProductColorId when frameChoice is catalog, even with an offeringId', () => {
    const result = quoteRequestSchema.safeParse({
      ...baseQuote,
      frameChoice: 'catalog',
      offeringId: 'clx000000000000000000000',
    });
    expect(result.success).toBe(false);
  });

  it('accepts a catalog choice with both an offeringId and a frameProductColorId', () => {
    const result = quoteRequestSchema.safeParse({
      ...baseQuote,
      frameChoice: 'catalog',
      offeringId: 'clx000000000000000000000',
      frameProductColorId: 'clx000000000000000000001',
    });
    expect(result.success).toBe(true);
  });

  it('does not require frameProductColorId when requesting advice (no product chosen)', () => {
    const result = quoteRequestSchema.safeParse(baseQuote);
    expect(result.success).toBe(true);
  });

  it('rejects when consent is not accepted', () => {
    const result = quoteRequestSchema.safeParse({ ...baseQuote, consent: false });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid email format when email is provided', () => {
    const result = quoteRequestSchema.safeParse({ ...baseQuote, email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('treats an empty-string email as absent', () => {
    const result = quoteRequestSchema.safeParse({ ...baseQuote, email: '' });
    expect(result.success && result.data.email).toBeUndefined();
  });

  it('rejects a missing name or phone', () => {
    expect(quoteRequestSchema.safeParse({ ...baseQuote, name: '' }).success).toBe(false);
    expect(quoteRequestSchema.safeParse({ ...baseQuote, phone: '' }).success).toBe(false);
  });

  it('defaults the honeypot field to empty when omitted', () => {
    const result = quoteRequestSchema.safeParse(baseQuote);
    expect(result.success && result.data.website).toBe('');
  });

  // Fase 10 (cotizador configurable): lensModality/treatments/additionalOptions
  // ya no validan contra un enum hardcodeado aquí — cualquier ID acotado
  // por forma pasa este schema; la allowlist real (qué IDs existen y cuáles
  // admite la categoría resuelta) se valida exclusivamente en
  // modules/catalog/quote-options-service.ts, nunca duplicada en este archivo.
  it('accepts an arbitrary bounded string as lensModality — the real allowlist check happens server-side', () => {
    const result = quoteRequestSchema.safeParse({ ...baseQuote, lensModality: 'progresivo' });
    expect(result.success).toBe(true);
  });

  it('rejects a lensModality that is too long (defense-in-depth shape check only)', () => {
    const result = quoteRequestSchema.safeParse({ ...baseQuote, lensModality: 'x'.repeat(61) });
    expect(result.success).toBe(false);
  });

  it('rejects duplicate-shaped payload issues (too many treatments)', () => {
    const result = quoteRequestSchema.safeParse({ ...baseQuote, treatments: Array.from({ length: 21 }, (_, i) => `t${i}`) });
    expect(result.success).toBe(false);
  });
});

const baseHomeVisit = {
  name: 'Pedro Soto',
  comuna: 'Quilicura',
  phone: '+56 9 8765 4321',
  consent: true,
};

describe('modules/requests/schemas — homeVisitRequestSchema', () => {
  it('accepts a valid minimal submission', () => {
    expect(homeVisitRequestSchema.safeParse(baseHomeVisit).success).toBe(true);
  });

  it('requires comuna', () => {
    expect(homeVisitRequestSchema.safeParse({ ...baseHomeVisit, comuna: '' }).success).toBe(false);
  });

  it('requires consent', () => {
    expect(homeVisitRequestSchema.safeParse({ ...baseHomeVisit, consent: false }).success).toBe(false);
  });

  it('accepts an optional attentionType from the allowed set', () => {
    const result = homeVisitRequestSchema.safeParse({ ...baseHomeVisit, attentionType: 'Ambas' });
    expect(result.success).toBe(true);
  });

  it('rejects an attentionType outside the allowed set', () => {
    const result = homeVisitRequestSchema.safeParse({ ...baseHomeVisit, attentionType: 'Otra cosa' });
    expect(result.success).toBe(false);
  });
});
