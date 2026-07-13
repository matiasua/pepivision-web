import { describe, expect, it } from 'vitest';
import { homeVisitRequestSchema, quoteRequestSchema } from '@/modules/requests/schemas';

const baseQuote = {
  frameChoice: 'advice' as const,
  glassType: 'Monofocal' as const,
  treatments: ['azul'],
  hasPrescription: 'Sí' as const,
  name: 'Juana Pérez',
  phone: '+56 9 1234 5678',
  consent: true,
};

describe('modules/requests/schemas — quoteRequestSchema', () => {
  it('accepts a valid submission requesting advice (no frame product needed)', () => {
    const result = quoteRequestSchema.safeParse(baseQuote);
    expect(result.success).toBe(true);
  });

  it('requires frameProductId when frameChoice is catalog', () => {
    const result = quoteRequestSchema.safeParse({ ...baseQuote, frameChoice: 'catalog' });
    expect(result.success).toBe(false);
  });

  it('accepts a catalog choice with a frameProductId', () => {
    const result = quoteRequestSchema.safeParse({
      ...baseQuote,
      frameChoice: 'catalog',
      frameProductId: 'clx000000000000000000000',
    });
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
