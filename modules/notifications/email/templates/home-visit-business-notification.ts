import { ADMIN_HOME_VISITS_URL } from '../config';
import { escapeHtml, renderButton, renderDataRow, renderInfoCard, renderStatusBadge } from '../components';
import { renderEmailFooter, renderEmailLayout, type FooterContactInfo } from '../layout';
import { formatDateCl, shortRequestId } from '../format';
import type { EmailMessage } from '../types';

export interface HomeVisitBusinessNotificationInput {
  requestId: string;
  name: string;
  phone: string;
  email: string | null;
  comuna: string;
  comunaCovered: boolean;
  attentionType: string | null;
  createdAt: Date;
  contact: FooterContactInfo;
}

export function homeVisitBusinessNotification(input: HomeVisitBusinessNotificationInput): EmailMessage {
  const ref = shortRequestId(input.requestId);
  const date = formatDateCl(input.createdAt);
  const coverageLabel = input.comunaCovered ? 'Comuna con cobertura' : 'Cobertura por confirmar';
  const coverageTone = input.comunaCovered ? 'success' : 'pending';

  const rows = [
    renderDataRow({ label: 'Nombre', value: escapeHtml(input.name) }),
    renderDataRow({ label: 'Teléfono', value: escapeHtml(input.phone) }),
    renderDataRow({ label: 'Correo', value: escapeHtml(input.email ?? '(no proporcionado)') }),
    renderDataRow({ label: 'Comuna', value: escapeHtml(input.comuna) }),
    renderDataRow({ label: 'Cobertura', value: renderStatusBadge(coverageLabel, coverageTone) }),
    renderDataRow({ label: 'Tipo de atención', value: escapeHtml(input.attentionType ?? '(no especificado)') }),
    renderDataRow({ label: 'Solicitud', value: escapeHtml(ref) }),
    renderDataRow({ label: 'Fecha', value: escapeHtml(date) }),
  ].join('');

  const bodyHtml = `
    <h1 style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:20px;color:#16265f;">Nueva consulta de atención a domicilio — ${escapeHtml(input.name)}</h1>
    <p style="margin:10px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#4a5170;">
      Se recibió una nueva consulta de atención a domicilio el ${date}.
    </p>
    ${renderInfoCard(rows)}
    ${renderButton('Revisar en administración', ADMIN_HOME_VISITS_URL, 'brand')}`;

  const html = renderEmailLayout({
    preheader: `Nueva consulta de atención a domicilio de ${input.name} en ${input.comuna}.`,
    bodyHtml,
    footerHtml: renderEmailFooter(input.contact),
  });

  const textLines = [
    `Nueva consulta de atención a domicilio (${ref}).`,
    `Nombre: ${input.name}`,
    `Comuna: ${input.comuna}`,
    `Cobertura: ${coverageLabel}`,
    `Teléfono: ${input.phone}`,
    `Correo: ${input.email ?? '(no proporcionado)'}`,
    `Tipo de atención: ${input.attentionType ?? '(no especificado)'}`,
    `Fecha: ${date}`,
    '',
    `Revisar en administración: ${ADMIN_HOME_VISITS_URL}`,
  ];

  return {
    subject: `Nueva consulta de atención a domicilio — ${input.name}`,
    preheader: `Nueva consulta de atención a domicilio de ${input.name} en ${input.comuna}.`,
    html,
    text: textLines.join('\n'),
  };
}
