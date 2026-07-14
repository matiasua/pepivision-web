import { escapeHtml, escapeHtmlMultiline, renderButton, renderDataRow, renderInfoCard, renderNotice } from '../components';
import { renderEmailFooter, renderEmailLayout, type FooterContactInfo } from '../layout';
import { formatDateCl, formatList, shortRequestId } from '../format';
import type { EmailMessage } from '../types';

export interface QuoteCustomerConfirmationInput {
  requestId: string;
  name: string;
  frameBrandName: string | null;
  frameProductName: string | null;
  frameProductCode: string | null;
  frameProductColorName: string | null;
  glassType: string;
  treatmentLabels: string[];
  prescriptionAnswer: string;
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
    input.frameBrandName ? renderDataRow({ label: 'Marca', value: escapeHtml(input.frameBrandName) }) : '',
    input.frameProductName ? renderDataRow({ label: 'Modelo', value: escapeHtml(input.frameProductName) }) : '',
    input.frameProductCode ? renderDataRow({ label: 'Código', value: escapeHtml(input.frameProductCode) }) : '',
    input.frameProductColorName ? renderDataRow({ label: 'Color', value: escapeHtml(input.frameProductColorName) }) : '',
    renderDataRow({ label: 'Tipo de cristal', value: escapeHtml(input.glassType) }),
    renderDataRow({ label: 'Tratamientos', value: escapeHtml(treatments) }),
    renderDataRow({ label: 'Receta óptica', value: escapeHtml(input.prescriptionAnswer) }),
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
    <p style="margin:18px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;color:#93a0bd;">
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
    ...(input.frameBrandName ? [`- Marca: ${input.frameBrandName}`] : []),
    ...(input.frameProductName ? [`- Modelo: ${input.frameProductName}`] : []),
    ...(input.frameProductCode ? [`- Código: ${input.frameProductCode}`] : []),
    ...(input.frameProductColorName ? [`- Color: ${input.frameProductColorName}`] : []),
    `- Tipo de cristal: ${input.glassType}`,
    `- Tratamientos: ${treatments}`,
    `- Receta óptica: ${input.prescriptionAnswer}`,
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
