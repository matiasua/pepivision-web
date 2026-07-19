import { escapeHtml, escapeHtmlMultiline, renderButton, renderDataRow, renderInfoCard, renderNotice } from '../components';
import { renderEmailFooter, renderEmailLayout, type FooterContactInfo } from '../layout';
import { formatDateCl, formatList, shortRequestId } from '../format';
import { formatClp } from '@/modules/catalog/labels';
import type { EmailMessage } from '../types';

export interface QuoteCustomerConfirmationInput {
  requestId: string;
  name: string;
  categoryName: string;
  frameBrandName: string | null;
  frameProductName: string | null;
  frameProductCode: string | null;
  frameProductColorName: string | null;
  /** Fase 13: valor histórico ya resuelto server-side desde `ProductOffering.priceFromClp` en el momento de la solicitud (nunca recalculado). `null` en el flujo de asesoría sin oferta — la fila se omite por completo, nunca "$0"/"Por cotizar"/"—". */
  priceFromSnapshot: number | null;
  glassType: string;
  treatmentLabels: string[];
  /** null cuando la categoría/modalidad no requiere receta (p. ej. Sin graduación) — la fila se omite por completo, nunca se muestra "—". */
  prescriptionAnswer: string | null;
  hasPrescriptionAttachment: boolean;
  comuna: string | null;
  message: string | null;
  whatsappHref: string;
  createdAt: Date;
  contact: FooterContactInfo;
}

export function quoteCustomerConfirmation(input: QuoteCustomerConfirmationInput): EmailMessage {
  const ref = shortRequestId(input.requestId);
  const treatments = formatList(input.treatmentLabels);
  const date = formatDateCl(input.createdAt);

  const rows = [
    renderDataRow({ label: 'Categoría', value: escapeHtml(input.categoryName) }),
    input.frameBrandName ? renderDataRow({ label: 'Marca', value: escapeHtml(input.frameBrandName) }) : '',
    input.frameProductName ? renderDataRow({ label: 'Modelo', value: escapeHtml(input.frameProductName) }) : '',
    input.frameProductCode ? renderDataRow({ label: 'Código', value: escapeHtml(input.frameProductCode) }) : '',
    input.frameProductColorName ? renderDataRow({ label: 'Color', value: escapeHtml(input.frameProductColorName) }) : '',
    input.priceFromSnapshot !== null
      ? renderDataRow({ label: 'Precio referencial', value: `Desde ${formatClp(input.priceFromSnapshot)}` })
      : '',
    renderDataRow({ label: 'Tipo de cristal', value: escapeHtml(input.glassType) }),
    renderDataRow({ label: 'Tratamientos', value: escapeHtml(treatments) }),
    input.prescriptionAnswer !== null ? renderDataRow({ label: 'Receta óptica', value: escapeHtml(input.prescriptionAnswer) }) : '',
    input.hasPrescriptionAttachment
      ? renderDataRow({ label: 'Archivo adjunto', value: 'Tu receta fue adjuntada correctamente.' })
      : '',
    input.comuna ? renderDataRow({ label: 'Comuna', value: escapeHtml(input.comuna) }) : '',
    input.message ? renderDataRow({ label: 'Mensaje', value: escapeHtmlMultiline(input.message) }) : '',
  ]
    .filter(Boolean)
    .join('');

  const bodyHtml = `
    <h1 style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:21px;color:#16265f;">Hola ${escapeHtml(input.name)},</h1>
    <p style="margin:10px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14.5px;line-height:1.6;color:#4a5170;">
      Recibimos tu solicitud de cotización (${ref}) el ${date}. Te contactaremos pronto con un presupuesto referencial —
      el valor final dependerá de tu receta, el armazón y los tratamientos seleccionados.
    </p>
    ${renderInfoCard(rows, { title: 'Resumen de tu cotización' })}
    ${renderNotice(
      'Próximos pasos: nuestro equipo revisará tu solicitud y te contactará por WhatsApp o correo con un presupuesto referencial a la brevedad.'
    )}
    ${renderButton('Continuar por WhatsApp', input.whatsappHref, 'whatsapp')}
    <p style="margin:18px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;color:#5b6b85;">
      Gracias por escribirnos.
    </p>`;

  const html = renderEmailLayout({
    preheader: `Recibimos tu cotización ${ref} — te contactaremos pronto con un presupuesto referencial.`,
    bodyHtml,
    footerHtml: renderEmailFooter(input.contact),
  });

  const textLines = [
    `Hola ${input.name},`,
    '',
    `Recibimos tu solicitud de cotización (${ref}) el ${date}. Te contactaremos pronto con un presupuesto referencial. El valor final dependerá de tu receta, el armazón y los tratamientos seleccionados.`,
    '',
    'Resumen de tu cotización:',
    `- Categoría: ${input.categoryName}`,
    ...(input.frameBrandName ? [`- Marca: ${input.frameBrandName}`] : []),
    ...(input.frameProductName ? [`- Modelo: ${input.frameProductName}`] : []),
    ...(input.frameProductCode ? [`- Código: ${input.frameProductCode}`] : []),
    ...(input.frameProductColorName ? [`- Color: ${input.frameProductColorName}`] : []),
    ...(input.priceFromSnapshot !== null ? [`- Precio referencial: Desde ${formatClp(input.priceFromSnapshot)}`] : []),
    `- Tipo de cristal: ${input.glassType}`,
    `- Tratamientos: ${treatments}`,
    ...(input.prescriptionAnswer !== null ? [`- Receta óptica: ${input.prescriptionAnswer}`] : []),
    ...(input.hasPrescriptionAttachment ? ['- Archivo adjunto: Tu receta fue adjuntada correctamente.'] : []),
    ...(input.comuna ? [`- Comuna: ${input.comuna}`] : []),
    ...(input.message ? [`- Mensaje: ${input.message}`] : []),
    '',
    'Próximos pasos: nuestro equipo revisará tu solicitud y te contactará por WhatsApp o correo con un presupuesto referencial a la brevedad.',
    '',
    `Continuar por WhatsApp: ${input.whatsappHref}`,
    '',
    'Gracias por escribirnos.',
    'Pepi Visión 360 · Ver bien nunca fue tan fácil',
  ];

  return {
    subject: 'Recibimos tu cotización — Pepi Visión 360',
    preheader: `Recibimos tu cotización ${ref} — te contactaremos pronto con un presupuesto referencial.`,
    html,
    text: textLines.join('\n'),
  };
}
