import { ADMIN_REQUESTS_URL } from '../config';
import { escapeHtml, escapeHtmlMultiline, renderButton, renderDataRow, renderInfoCard, renderNotice } from '../components';
import { renderEmailFooter, renderEmailLayout, type FooterContactInfo } from '../layout';
import { formatDateCl, formatList, shortRequestId } from '../format';
import type { EmailMessage } from '../types';

export interface QuoteBusinessNotificationInput {
  requestId: string;
  name: string;
  phone: string;
  email: string | null;
  comuna: string | null;
  message: string | null;
  frameBrandName: string | null;
  frameProductName: string | null;
  frameProductCode: string | null;
  frameProductColorName: string | null;
  glassType: string;
  treatmentLabels: string[];
  prescriptionAnswer: string;
  hasPrescriptionAttachment: boolean;
  createdAt: Date;
  contact: FooterContactInfo;
}

export function quoteBusinessNotification(input: QuoteBusinessNotificationInput): EmailMessage {
  const ref = shortRequestId(input.requestId);
  const treatments = formatList(input.treatmentLabels);
  const date = formatDateCl(input.createdAt);

  const rows = [
    renderDataRow({ label: 'Nombre', value: escapeHtml(input.name) }),
    renderDataRow({ label: 'Teléfono', value: escapeHtml(input.phone) }),
    renderDataRow({ label: 'Correo', value: escapeHtml(input.email ?? '(no proporcionado)') }),
    renderDataRow({ label: 'Comuna', value: escapeHtml(input.comuna ?? '(no proporcionada)') }),
    renderDataRow({ label: 'Marca', value: escapeHtml(input.frameBrandName ?? '(sin marca)') }),
    renderDataRow({ label: 'Modelo', value: escapeHtml(input.frameProductName ?? '(sin modelo seleccionado)') }),
    input.frameProductCode ? renderDataRow({ label: 'Código', value: escapeHtml(input.frameProductCode) }) : '',
    renderDataRow({ label: 'Color', value: escapeHtml(input.frameProductColorName ?? '(sin color seleccionado)') }),
    renderDataRow({ label: 'Tipo de cristal', value: escapeHtml(input.glassType) }),
    renderDataRow({ label: 'Tratamientos', value: escapeHtml(treatments) }),
    renderDataRow({ label: 'Receta óptica', value: escapeHtml(input.prescriptionAnswer) }),
    renderDataRow({ label: 'Mensaje', value: input.message ? escapeHtmlMultiline(input.message) : '(sin mensaje)' }),
    renderDataRow({ label: 'Solicitud', value: escapeHtml(ref) }),
    renderDataRow({ label: 'Fecha', value: escapeHtml(date) }),
  ]
    .filter(Boolean)
    .join('');

  // Deliberately just a pointer, never the file/storageKey/URL — see
  // modules/requests/service.ts and design.md → "Adjuntos de solicitudes".
  const attachmentNoticeHtml = input.hasPrescriptionAttachment
    ? renderNotice('Esta solicitud incluye una receta adjunta disponible de forma segura en el panel de administración.')
    : '';
  const attachmentNoticeText = input.hasPrescriptionAttachment
    ? 'Esta solicitud incluye una receta adjunta disponible de forma segura en el panel de administración.'
    : null;

  const bodyHtml = `
    <h1 style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:20px;color:#16265f;">Nueva cotización — ${escapeHtml(input.name)}</h1>
    <p style="margin:10px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#4a5170;">
      Se recibió una nueva solicitud de cotización el ${date}.
    </p>
    ${renderInfoCard(rows)}
    ${attachmentNoticeHtml}
    ${renderButton('Revisar en administración', ADMIN_REQUESTS_URL, 'brand')}`;

  const html = renderEmailLayout({
    preheader: `Nueva cotización de ${input.name} — revísala en el panel de administración.`,
    bodyHtml,
    footerHtml: renderEmailFooter(input.contact),
  });

  const textLines = [
    `Nueva solicitud de cotización (${ref}).`,
    `Nombre: ${input.name}`,
    `Teléfono: ${input.phone}`,
    `Correo: ${input.email ?? '(no proporcionado)'}`,
    `Comuna: ${input.comuna ?? '(no proporcionada)'}`,
    `Marca: ${input.frameBrandName ?? '(sin marca)'}`,
    `Modelo: ${input.frameProductName ?? '(sin modelo seleccionado)'}`,
    ...(input.frameProductCode ? [`Código: ${input.frameProductCode}`] : []),
    `Color: ${input.frameProductColorName ?? '(sin color seleccionado)'}`,
    `Tipo de cristal: ${input.glassType}`,
    `Tratamientos: ${treatments}`,
    `Receta óptica: ${input.prescriptionAnswer}`,
    `Mensaje: ${input.message ?? '(sin mensaje)'}`,
    `Fecha: ${date}`,
    ...(attachmentNoticeText ? [attachmentNoticeText] : []),
    '',
    `Revisar en administración: ${ADMIN_REQUESTS_URL}`,
  ];

  return {
    subject: `Nueva cotización — ${input.name}`,
    preheader: `Nueva cotización de ${input.name} — revísala en el panel de administración.`,
    html,
    text: textLines.join('\n'),
  };
}
