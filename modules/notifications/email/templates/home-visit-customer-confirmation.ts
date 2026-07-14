import { escapeHtml, renderDataRow, renderInfoCard, renderNotice, renderStatusBadge } from '../components';
import { renderEmailFooter, renderEmailLayout, type FooterContactInfo } from '../layout';
import { formatDateCl, shortRequestId } from '../format';
import type { EmailMessage } from '../types';

export interface HomeVisitCustomerConfirmationInput {
  requestId: string;
  name: string;
  comuna: string;
  attentionType: string | null;
  comunaCovered: boolean;
  createdAt: Date;
  contact: FooterContactInfo;
}

export function homeVisitCustomerConfirmation(input: HomeVisitCustomerConfirmationInput): EmailMessage {
  const ref = shortRequestId(input.requestId);
  const date = formatDateCl(input.createdAt);
  const coverageLabel = input.comunaCovered ? 'Comuna con cobertura' : 'Cobertura por confirmar';
  const coverageTone = input.comunaCovered ? 'success' : 'pending';
  // A comuna outside the current coverage list is never presented as a
  // hard rejection — the business can still coordinate it manually (see
  // design.md → "Atención a domicilio").
  const coverageNotice = input.comunaCovered
    ? 'Tu comuna ya cuenta con cobertura habilitada — coordinaremos la visita a la brevedad.'
    : 'Tu comuna no está en la lista de cobertura automática, pero eso no significa que no podamos atenderte: revisaremos tu caso y te confirmaremos disponibilidad a la brevedad.';

  const rows = [
    renderDataRow({ label: 'Comuna', value: escapeHtml(input.comuna) }),
    renderDataRow({ label: 'Tipo de atención', value: escapeHtml(input.attentionType ?? 'No especificado') }),
    renderDataRow({ label: 'Cobertura', value: renderStatusBadge(coverageLabel, coverageTone) }),
  ].join('');

  const bodyHtml = `
    <h1 style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:21px;color:#16265f;">Hola ${escapeHtml(input.name)},</h1>
    <p style="margin:10px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14.5px;line-height:1.6;color:#4a5170;">
      Recibimos tu consulta de atención a domicilio (${ref}) el ${date}.
    </p>
    ${renderInfoCard(rows, { title: 'Resumen de tu consulta' })}
    ${renderNotice(coverageNotice)}
    <p style="margin:18px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;color:#5b6b85;">
      Gracias por escribirnos.
    </p>`;

  const html = renderEmailLayout({
    preheader: `Recibimos tu consulta de atención a domicilio (${ref}) para ${input.comuna}.`,
    bodyHtml,
    footerHtml: renderEmailFooter(input.contact),
  });

  const textLines = [
    `Hola ${input.name},`,
    '',
    `Recibimos tu consulta de atención a domicilio (${ref}) el ${date}.`,
    '',
    'Resumen de tu consulta:',
    `- Comuna: ${input.comuna}`,
    `- Tipo de atención: ${input.attentionType ?? 'No especificado'}`,
    `- Cobertura: ${coverageLabel}`,
    '',
    coverageNotice,
    '',
    'Gracias por escribirnos.',
    'Pepi Visión 360 · Ver bien nunca fue tan fácil',
  ];

  return {
    subject: 'Recibimos tu consulta de atención a domicilio — Pepi Visión 360',
    preheader: `Recibimos tu consulta de atención a domicilio (${ref}) para ${input.comuna}.`,
    html,
    text: textLines.join('\n'),
  };
}
