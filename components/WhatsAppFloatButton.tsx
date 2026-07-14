import { defaultWhatsAppHref } from '@/lib/whatsapp';
import { WhatsAppIcon } from '@/components/icons';

export function WhatsAppFloatButton() {
  return (
    <a
      href={defaultWhatsAppHref}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escríbenos por WhatsApp"
      className="animate-pulse-whatsapp fixed bottom-[22px] right-[22px] z-40 flex h-[60px] w-[60px] items-center justify-center rounded-full bg-whatsapp shadow-[0_8px_24px_-4px_rgba(37,211,102,0.55)]"
    >
      <WhatsAppIcon className="h-8 w-8 text-white" />
    </a>
  );
}
