import { siteConfig } from '@/lib/site-config';

/** Builds a wa.me link with a prefilled message — no WhatsApp Business API, per design.md. */
export function buildWhatsAppLink(message: string): string {
  return `https://wa.me/${siteConfig.waPhone}?text=${encodeURIComponent(message)}`;
}

export const defaultWhatsAppHref = buildWhatsAppLink(
  'Hola Pepi Visión 360, quiero cotizar mis lentes.'
);
