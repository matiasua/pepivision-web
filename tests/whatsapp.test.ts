import { describe, expect, it } from 'vitest';
import { buildWhatsAppLinkToPhone } from '@/lib/whatsapp';

describe('lib/whatsapp — buildWhatsAppLinkToPhone', () => {
  it('strips non-digit characters from the phone number', () => {
    const href = buildWhatsAppLinkToPhone('+56 9 1234 5678', 'Hola');
    expect(href).toBe('https://wa.me/56912345678?text=Hola');
  });

  it('encodes the message', () => {
    const href = buildWhatsAppLinkToPhone('56912345678', 'Hola, ¿cómo estás?');
    expect(href).toContain(encodeURIComponent('Hola, ¿cómo estás?'));
  });
});
