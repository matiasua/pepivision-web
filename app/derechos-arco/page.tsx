import type { Metadata } from 'next';
import { Container } from '@/components/Container';
import { PageHeroBand } from '@/components/PageHeroBand';
import { LegalDraftNotice } from '@/components/LegalDraftNotice';
import { Card } from '@/components/Card';
import { siteConfig } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Derechos ARCO',
  description: 'Puedes ejercer en cualquier momento tus derechos sobre los datos personales que tratamos.',
};

const rights = [
  { name: 'Acceso', description: 'Saber qué datos tuyos tenemos y cómo los usamos.' },
  { name: 'Rectificación', description: 'Corregir datos inexactos o desactualizados.' },
  { name: 'Cancelación', description: 'Eliminar (suprimir) tus datos cuando corresponda.' },
  { name: 'Oposición', description: 'Oponerte a un uso específico de tus datos.' },
  { name: 'Portabilidad', description: 'Recibir tus datos en un formato reutilizable.' },
  { name: 'Bloqueo', description: 'Suspender temporalmente el tratamiento.' },
];

export default function DerechosArcoPage() {
  return (
    <>
      <PageHeroBand
        eyebrow="Tus datos, tu control"
        title="Derechos ARCO"
        description="Puedes ejercer en cualquier momento tus derechos sobre los datos personales que tratamos. Responderemos tu solicitud a la brevedad."
      />
      <LegalDraftNotice />

      <section className="py-9">
        <Container size="default">
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {rights.map((right) => (
              <Card key={right.name} padding="sm">
                <div className="font-display text-[15px] font-bold text-fucsia">{right.name}</div>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-grafito">{right.description}</p>
              </Card>
            ))}
          </div>

          <Card padding="lg" className="mt-6">
            <h2 className="text-xl font-bold">Formulario de solicitud</h2>
            <p className="mt-2 text-sm leading-relaxed text-grafito">
              El formulario para verificar tu identidad y enviar tu solicitud (con persistencia real y
              seguimiento por parte de nuestro equipo) se habilita en una fase posterior de este proyecto.
              Mientras tanto, puedes ejercer tus derechos escribiéndonos directamente a{' '}
              <a href={`mailto:${siteConfig.email}`} className="font-semibold text-fucsia">
                {siteConfig.email}
              </a>{' '}
              indicando: tu nombre completo, el derecho que deseas ejercer y el detalle de tu solicitud.
            </p>
          </Card>
        </Container>
      </section>
    </>
  );
}
