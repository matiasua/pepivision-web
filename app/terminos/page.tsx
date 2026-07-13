import type { Metadata } from 'next';
import { PageHeroBand } from '@/components/PageHeroBand';
import { LegalDocument } from '@/components/LegalDocument';
import { LegalDraftNotice } from '@/components/LegalDraftNotice';
import { siteConfig } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Términos y condiciones',
  description: 'Condiciones de uso del sitio y de nuestro servicio de cotización y venta de lentes.',
};

export default function TerminosPage() {
  const sections = [
    {
      title: '1 · Precios referenciales',
      body: 'Todos los precios se muestran como valores "desde" y son referenciales. El valor final depende del armazón, el tipo de cristal, el aumento y los tratamientos seleccionados, y se confirma en la cotización.',
    },
    {
      title: '2 · Cotizaciones',
      body: 'Las cotizaciones son informativas y no constituyen una obligación de compra ni de venta. Su vigencia se indica al momento de entregarlas.',
    },
    {
      title: '3 · Disponibilidad',
      body: 'La disponibilidad de los modelos está sujeta a stock y puede variar. Los modelos "bajo pedido" requieren confirmación previa de plazo.',
    },
    {
      title: '4 · Imágenes',
      body: 'Las fotografías de los productos son referenciales y pueden presentar diferencias de color según tu pantalla.',
    },
    {
      title: '5 · Atención a domicilio',
      body: 'El servicio a domicilio está sujeto a cobertura y coordinación previa, y se confirma caso a caso según la comuna.',
    },
    {
      title: '6 · Salud visual',
      body: 'La elección de cristales debe basarse en tu receta y en la recomendación de un profesional de la salud visual. Pepi Visión 360 no reemplaza el diagnóstico profesional.',
    },
    {
      title: '7 · Contacto',
      body: `Ante cualquier duda escríbenos a ${siteConfig.email} o por WhatsApp al ${siteConfig.phoneDisplay}.`,
    },
  ];

  return (
    <>
      <PageHeroBand
        eyebrow="Información"
        title="Términos y condiciones"
        description="Condiciones de uso del sitio y de nuestro servicio de cotización y venta de lentes."
      />
      <LegalDraftNotice />
      <LegalDocument sections={sections} lastUpdated="Última actualización: julio de 2026." />
    </>
  );
}
