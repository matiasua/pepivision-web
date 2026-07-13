import type { Metadata } from 'next';
import { Container } from '@/components/Container';
import { PageHeroBand } from '@/components/PageHeroBand';
import { Card, IconBadge } from '@/components/Card';
import { LinkButton } from '@/components/Button';
import { WhatsAppIcon } from '@/components/icons';
import { buildWhatsAppLink } from '@/lib/whatsapp';

export const metadata: Metadata = {
  title: 'Atención a domicilio',
  description:
    'Llevamos la experiencia Pepi Visión 360 hasta tu hogar, con coordinación previa y asesoría personalizada.',
};

const steps = [
  { title: '1 · Coordinación previa', description: 'Agendamos día y hora según tu disponibilidad.' },
  { title: '2 · Asesoría personalizada', description: 'Te orientamos para elegir armazón y cristales.' },
  { title: '3 · Revisión de modelos', description: 'Conoces modelos disponibles para decidir con calma.' },
  { title: '4 · Entrega o atención', description: 'Según cobertura y confirmación de tu comuna.' },
];

const homeVisitWhatsAppHref = buildWhatsAppLink(
  'Hola Pepi Visión 360, quiero consultar la cobertura de atención a domicilio para mi comuna.'
);

export default function DomicilioPage() {
  return (
    <>
      <PageHeroBand
        eyebrow="Cómodo y cercano"
        title="Atención a domicilio"
        description="Llevamos la experiencia Pepi Visión 360 hasta tu hogar, con coordinación previa y asesoría personalizada."
      />

      <section className="py-11">
        <Container size="default">
          <div className="grid grid-cols-1 gap-4.5 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <Card key={step.title}>
                <IconBadge>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--color-blue)" strokeWidth={1.8}>
                    <path d="M8 2v3M16 2v3M3 9h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
                  </svg>
                </IconBadge>
                <h3 className="mt-3.5 text-base font-semibold">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-grafito">{step.description}</p>
              </Card>
            ))}
          </div>

          <div className="mt-11 grid grid-cols-1 items-center gap-8.5 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold sm:text-[26px]">Consulta cobertura para tu comuna</h2>
              <p className="mt-3 leading-relaxed text-grafito">
                Escríbenos indicando tu comuna y te confirmamos si podemos coordinar atención a domicilio en
                tu zona. La disponibilidad se confirma caso a caso.
              </p>
              <div className="mt-5 flex items-center gap-2.5 font-semibold text-navy">
                <WhatsAppIcon className="h-5 w-5 text-whatsapp" />
                Respondemos directo por WhatsApp
              </div>
            </div>

            <Card padding="lg" className="text-center">
              <p className="text-sm leading-relaxed text-grafito">
                El formulario de consulta de cobertura (validado contra la lista de comunas habilitadas) se
                habilita en una fase posterior. Mientras tanto, cuéntanos tu comuna directamente por
                WhatsApp y te confirmamos la disponibilidad.
              </p>
              <div className="mt-5">
                <LinkButton href={homeVisitWhatsAppHref} variant="whatsapp" className="w-full">
                  <WhatsAppIcon className="h-[19px] w-[19px]" />
                  Consultar atención a domicilio
                </LinkButton>
              </div>
            </Card>
          </div>
        </Container>
      </section>
    </>
  );
}
