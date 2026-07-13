import type { Metadata } from 'next';
import { Container } from '@/components/Container';
import { SectionHeading } from '@/components/SectionHeading';
import { siteConfig, instagramUrl } from '@/lib/site-config';
import { defaultWhatsAppHref } from '@/lib/whatsapp';
import { WhatsAppIcon, InstagramIcon } from '@/components/icons';

export const metadata: Metadata = {
  title: 'Contacto',
  description: 'Escríbenos por el canal que prefieras. Respondemos con gusto.',
};

function ContactCard({
  icon,
  iconTone = 'soft',
  title,
  value,
  href,
}: {
  icon: React.ReactNode;
  iconTone?: 'whatsapp' | 'soft';
  title: string;
  value: string;
  href?: string;
}) {
  const content = (
    <>
      <div
        className={`flex h-[54px] w-[54px] items-center justify-center rounded-2xl ${
          iconTone === 'whatsapp' ? 'bg-success-bg' : 'bg-brand-gradient-soft'
        }`}
      >
        {icon}
      </div>
      <div>
        <div className="text-lg font-semibold text-navy">{title}</div>
        <div className="mt-0.5 text-sm text-grafito">{value}</div>
      </div>
    </>
  );

  const className =
    'flex items-center gap-4 rounded-card border border-line bg-white p-6 shadow-brand-sm transition-transform duration-200 hover:-translate-y-1';

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {content}
      </a>
    );
  }
  return <div className={className}>{content}</div>;
}

export default function ContactoPage() {
  return (
    <section className="py-12">
      <Container>
        <SectionHeading
          as="h1"
          center
          title="Contacto"
          subtitle="Escríbenos por el canal que prefieras. Respondemos con gusto."
        />

        <div className="mt-9 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <ContactCard
            icon={<WhatsAppIcon className="h-7 w-7 text-whatsapp" />}
            iconTone="whatsapp"
            title="WhatsApp"
            value={siteConfig.phoneDisplay}
            href={defaultWhatsAppHref}
          />
          <ContactCard
            icon={<InstagramIcon className="h-7 w-7 text-fucsia" />}
            title="Instagram"
            value={`@${siteConfig.instagram}`}
            href={instagramUrl}
          />
          <ContactCard
            icon={
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--color-blue)" strokeWidth={1.9}>
                <rect x="3" y="5" width="18" height="14" rx="2.5" />
                <path d="m3 7 9 6 9-6" />
              </svg>
            }
            title="Correo"
            value={siteConfig.email}
          />
          <ContactCard
            icon={
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--color-fucsia)" strokeWidth={1.9}>
                <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.4-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
              </svg>
            }
            title="Teléfono"
            value={siteConfig.phoneDisplay}
          />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="rounded-card bg-brand-gradient-soft p-6">
            <div className="flex items-center gap-2.5 text-base font-semibold text-navy">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-blue)" strokeWidth={2}>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
              Horarios de atención
            </div>
            <div className="mt-2.5 text-[15px] text-grafito">{siteConfig.horario}</div>
          </div>
          <div className="rounded-card bg-brand-gradient-soft p-6">
            <div className="flex items-center gap-2.5 text-base font-semibold text-navy">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-fucsia)" strokeWidth={2}>
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              Ubicación
            </div>
            <div className="mt-2.5 text-[15px] text-grafito">{siteConfig.ubicacion}</div>
          </div>
        </div>
      </Container>
    </section>
  );
}
