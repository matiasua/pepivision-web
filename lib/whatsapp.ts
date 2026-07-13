import { siteConfig } from '@/lib/site-config';

/** Builds a wa.me link with a prefilled message — no WhatsApp Business API, per design.md. */
export function buildWhatsAppLink(message: string): string {
  return `https://wa.me/${siteConfig.waPhone}?text=${encodeURIComponent(message)}`;
}

/** Builds a wa.me link to an arbitrary phone (e.g. a customer's, from the admin bandeja), not the business's own number. */
export function buildWhatsAppLinkToPhone(phone: string, message: string): string {
  const digitsOnly = phone.replace(/\D/g, '');
  return `https://wa.me/${digitsOnly}?text=${encodeURIComponent(message)}`;
}

export const defaultWhatsAppHref = buildWhatsAppLink(
  'Hola Pepi Visión 360, quiero cotizar mis lentes.'
);
