import { ADMIN_ARCO_URL } from '../config';
import { escapeHtml, escapeHtmlMultiline, renderButton, renderDataRow, renderInfoCard, renderNotice } from '../components';
import { renderEmailFooter, renderEmailLayout, type FooterContactInfo } from '../layout';
import { formatDateCl, shortRequestId } from '../format';
import type { EmailMessage } from '../types';

export interface DataRightsBusinessNotificationInput {
  requestId: string;
  rightTypeLabel: string;
  name: string;
  email: string;
  phone: string | null;
  description: string;
  createdAt: Date;
  contact: FooterContactInfo;
}

export function dataRightsBusinessNotification(input: DataRightsBusinessNotificationInput): EmailMessage {
  const ref = shortRequestId(input.requestId);
  const date = formatDateCl(input.createdAt);

  const rows = [
    renderDataRow({ label: 'Derecho', value: escapeHtml(input.rightTypeLabel) }),
    renderDataRow({ label: 'Nombre', value: escapeHtml(input.name) }),
    renderDataRow({ label: 'Correo', value: escapeHtml(input.email) }),
    renderDataRow({ label: 'Teléfono', value: escapeHtml(input.phone ?? '(no proporcionado)') }),
    renderDataRow({ label: 'Descripción', value: escapeHtmlMultiline(input.description) }),
    renderDataRow({ label: 'Solicitud', value: escapeHtml(ref) }),
    renderDataRow({ label: 'Fecha de recepción', value: escapeHtml(date) }),
  ].join('');

  const bodyHtml = `
    <h1 style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:20px;color:#16265f;">Nueva solicitud de derechos ARCO — ${escapeHtml(input.rightTypeLabel)}</h1>
    <p style="margin:10px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#4a5170;">
      Se recibió una nueva solicitud de derechos ARCO el ${date}.
    </p>
    ${renderInfoCard(rows)}
    ${renderNotice('Esta solicitud contiene datos personales. Trátala de forma confidencial y solo para fines de gestión de la solicitud, conforme a la normativa de protección de datos.')}
    ${renderButton('Revisar en administración', ADMIN_ARCO_URL, 'brand')}`;

  const html = renderEmailLayout({
    preheader: `Nueva solicitud de derechos ARCO (${input.rightTypeLabel}) de ${input.name}.`,
    bodyHtml,
    footerHtml: renderEmailFooter(input.contact),
  });

  const textLines = [
    `Nueva solicitud de derechos ARCO (${ref}).`,
    `Derecho: ${input.rightTypeLabel}`,
    `Nombre: ${input.name}`,
    `Correo: ${input.email}`,
    `Teléfono: ${input.phone ?? '(no proporcionado)'}`,
    `Descripción: ${input.description}`,
    `Fecha de recepción: ${date}`,
    '',
    'Esta solicitud contiene datos personales. Trátala de forma confidencial y solo para fines de gestión de la solicitud, conforme a la normativa de protección de datos.',
    '',
    `Revisar en administración: ${ADMIN_ARCO_URL}`,
  ];

  return {
    subject: `Nueva solicitud de derechos ARCO — ${input.rightTypeLabel}`,
    preheader: `Nueva solicitud de derechos ARCO (${input.rightTypeLabel}) de ${input.name}.`,
    html,
    text: textLines.join('\n'),
  };
}
