import type { Metadata } from 'next';
import { Container } from '@/components/Container';
import { SectionHeading } from '@/components/SectionHeading';
import { FaqAccordion } from '@/components/FaqAccordion';
import { isHomeVisitEnabled } from '@/lib/feature-flags';

export const metadata: Metadata = {
  title: 'Preguntas frecuentes',
  description: 'Lo que necesitas saber antes de pedir tus lentes en Pepi Visión 360.',
};

const ALL_FAQS: { q: string; a: string; homeVisitOnly?: boolean }[] = [
  {
    q: '¿Cómo puedo solicitar una cotización?',
    a: 'Puedes usar nuestro cotizador en línea o escribirnos directamente por WhatsApp. Te preparamos un presupuesto referencial según el armazón, los cristales y los tratamientos que elijas.',
  },
  {
    q: '¿Necesito una receta óptica?',
    a: 'Para cristales recetados necesitamos tu receta óptica vigente. Si solo quieres el armazón, no es necesaria. Ante cualquier duda, te orientamos.',
  },
  {
    q: '¿Puedo enviar una fotografía de mi receta?',
    a: 'Sí. Puedes indicarlo en el cotizador y coordinar el envío por WhatsApp. Procuramos que la imagen sea clara y legible.',
  },
  {
    q: '¿Qué diferencia existe entre monofocales, bifocales y progresivos?',
    a: 'Los monofocales corrigen una sola distancia; los bifocales tienen dos zonas (lejos y cerca); los progresivos ofrecen una transición gradual para lejos, intermedia y cerca. La elección final depende de tu receta y la recomendación profesional.',
  },
  {
    // Marked so it can be filtered out while the home-visit service is
    // disabled — see openspec/changes/temporarily-disable-home-visit.
    q: '¿Realizan atención a domicilio?',
    a: 'Ofrecemos atención a domicilio con coordinación previa y según cobertura. Consúltanos indicando tu comuna y confirmamos la disponibilidad para tu zona.',
    homeVisitOnly: true,
  },
  {
    q: '¿Cómo sé si un armazón está disponible?',
    a: 'Cada modelo indica su disponibilidad en el catálogo. También puedes escribirnos por WhatsApp para confirmar stock.',
  },
  {
    q: '¿Cuánto demora la preparación de los lentes?',
    a: 'El tiempo de preparación depende del tipo de cristal y los tratamientos seleccionados. Te informaremos el plazo estimado al momento de confirmar tu pedido.',
  },
  {
    q: '¿Qué medios de pago aceptan?',
    a: 'Coordinamos los medios de pago disponibles al momento de tu cotización. Escríbenos y te indicamos las alternativas vigentes.',
  },
  {
    q: '¿Puedo comprar solamente el armazón?',
    a: 'Sí, puedes adquirir únicamente el armazón si lo prefieres. También puedes incorporar cristales recetados cuando quieras.',
  },
];

export default function FaqPage() {
  const homeVisitEnabled = isHomeVisitEnabled();
  const faqs = homeVisitEnabled ? ALL_FAQS : ALL_FAQS.filter((item) => !item.homeVisitOnly);

  return (
    <section className="py-12">
      <Container size="narrow">
        <SectionHeading
          as="h1"
          center
          title="Preguntas frecuentes"
          subtitle="Lo que necesitas saber antes de pedir tus lentes."
        />
        <div className="mt-8">
          <FaqAccordion items={faqs} />
        </div>
      </Container>
    </section>
  );
}
