import type { Metadata } from 'next';
import { PageHeroBand } from '@/components/PageHeroBand';
import { LegalDocument } from '@/components/LegalDocument';
import { LegalDraftNotice } from '@/components/LegalDraftNotice';
import { LinkButton } from '@/components/Button';
import { siteConfig } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Política de Privacidad',
  description: 'Cómo tratamos y protegemos tus datos personales en Pepi Visión 360.',
};

export default function PrivacidadPage() {
  const sections = [
    {
      title: '1 · Responsable del tratamiento',
      body: `Pepi Visión 360, óptica virtual con domicilio en ${siteConfig.ubicacion}, es responsable del tratamiento de los datos personales recopilados en este sitio. Contacto: ${siteConfig.email} · WhatsApp ${siteConfig.phoneDisplay}.`,
    },
    {
      title: '2 · Datos que recopilamos',
      body: 'Solo los datos que nos entregas voluntariamente: nombre, teléfono, correo electrónico, comuna y el detalle de tu requerimiento. Si adjuntas tu receta óptica, tratamos los datos de salud visual que contiene.',
    },
    {
      title: '3 · Finalidad',
      body: 'Usamos tus datos exclusivamente para: (i) preparar y entregar tu cotización; (ii) coordinar la atención y el eventual servicio a domicilio; (iii) responder tus consultas y darte seguimiento. No los usamos para fines distintos sin tu consentimiento previo.',
    },
    {
      title: '4 · Base de licitud (consentimiento)',
      body: 'El tratamiento se realiza sobre la base de tu consentimiento libre, informado y específico, otorgado al marcar la casilla de autorización en nuestros formularios. Puedes revocarlo en cualquier momento.',
    },
    {
      title: '5 · Datos sensibles (salud visual)',
      body: 'La receta óptica constituye un dato sensible. La tratamos con especial cuidado, solo con tu consentimiento expreso y únicamente para preparar tus lentes.',
    },
    {
      title: '6 · Plazo de conservación',
      body: 'Conservamos tus datos por el tiempo necesario para cumplir la finalidad informada y, como máximo, 12 meses después de tu último contacto, salvo que una obligación legal exija un plazo mayor. Cumplido el plazo, eliminamos o anonimizamos la información.',
    },
    {
      title: '7 · Comunicación a terceros',
      body: 'No vendemos ni cedemos tus datos. Solo compartimos la información estrictamente necesaria con laboratorios ópticos que fabrican tus cristales, quienes se obligan a mantener confidencialidad.',
    },
    {
      title: '8 · Seguridad',
      body: 'Aplicamos medidas técnicas y organizativas razonables para proteger tus datos frente a accesos no autorizados, pérdida o uso indebido.',
    },
    {
      title: '9 · Tus derechos (ARCO)',
      body: `Tienes derecho a acceder, rectificar, cancelar (suprimir) y oponerte al tratamiento de tus datos, además de solicitar su portabilidad y bloqueo. Ejércelos en la sección Derechos ARCO o escribiéndonos a ${siteConfig.email}.`,
    },
    {
      title: '10 · Cookies',
      body: 'Utilizamos cookies y almacenamiento local mínimos para recordar tus preferencias y mejorar tu experiencia. Puedes gestionarlas desde la configuración de tu navegador.',
    },
    {
      title: '11 · Marco legal y autoridad',
      body: 'Este tratamiento se rige por la Ley N° 19.628 sobre Protección de la Vida Privada y por la Ley N° 21.719, que moderniza la protección de datos y crea la Agencia de Protección de Datos Personales, ante la cual puedes presentar reclamos.',
    },
  ];

  return (
    <>
      <PageHeroBand
        eyebrow="Protección de datos"
        title="Política de Privacidad"
        description={`Cómo tratamos y protegemos tus datos personales en Pepi Visión 360, conforme a la Ley N° 19.628 y la Ley N° 21.719 de Chile.`}
      />
      <LegalDraftNotice />
      <LegalDocument sections={sections} lastUpdated="Última actualización: julio de 2026. Podremos actualizar esta política; publicaremos los cambios en esta misma página.">
        <div className="mt-6.5 rounded-2xl bg-brand-gradient-soft p-6">
          <div className="font-display text-base font-bold text-navy">¿Quieres ejercer tus derechos?</div>
          <p className="mt-2 text-sm leading-relaxed">
            Puedes solicitar acceso, rectificación, cancelación u oposición sobre tus datos personales.
          </p>
          <div className="mt-3.5">
            <LinkButton href="/derechos-arco" variant="primary" size="sm">
              Ir a Derechos ARCO
            </LinkButton>
          </div>
        </div>
      </LegalDocument>
    </>
  );
}
