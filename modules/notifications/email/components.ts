import { emailColors, emailFontFamily } from './styles';
import type { EmailBadgeTone, EmailButtonTone, EmailDataRow } from './types';

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * The one function every template MUST run untrusted, user-entered text
 * through before it touches the HTML string — names, messages, comunas,
 * descriptions, anything that ultimately came from a public form. Nothing
 * in this module ever interpolates raw user input directly.
 */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char] ?? char);
}

/** Escapes, then turns newlines into <br> — for free-text fields (message, description) that legitimately span lines. */
export function escapeHtmlMultiline(value: string): string {
  return escapeHtml(value).replace(/\r\n|\r|\n/g, '<br>');
}

/** One label/value line inside an renderInfoCard() table — value must already be safe HTML (escaped or a trusted fragment). */
export function renderDataRow({ label, value }: EmailDataRow): string {
  return `
    <tr>
      <td style="padding:6px 0;font-size:13px;color:${emailColors.grafito};font-family:${emailFontFamily};width:40%;vertical-align:top;">${escapeHtml(label)}</td>
      <td style="padding:6px 0;font-size:14px;color:${emailColors.ink};font-family:${emailFontFamily};font-weight:600;vertical-align:top;">${value}</td>
    </tr>`;
}

/** Wraps a set of renderDataRow() rows (already-built <tr> HTML) in a bordered, light-gray card. */
export function renderInfoCard(rowsHtml: string, opts?: { title?: string }): string {
  const titleHtml = opts?.title
    ? `<div style="margin-bottom:10px;font-family:${emailFontFamily};font-size:13px;font-weight:700;color:${emailColors.navy};text-transform:uppercase;letter-spacing:0.04em;">${escapeHtml(opts.title)}</div>`
    : '';
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${emailColors.gray};border:1px solid ${emailColors.line};border-radius:14px;margin:20px 0;">
      <tr>
        <td style="padding:18px 20px;">
          ${titleHtml}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            ${rowsHtml}
          </table>
        </td>
      </tr>
    </table>`;
}

const BADGE_TONE_STYLES: Record<EmailBadgeTone, { bg: string; fg: string }> = {
  success: { bg: emailColors.successBg, fg: emailColors.success },
  pending: { bg: '#eaf1fb', fg: emailColors.navy },
  info: { bg: emailColors.gray2, fg: emailColors.navy },
};

/** A small colored pill — e.g. "Comuna cubierta" / "Cobertura por confirmar". Label is escaped internally. */
export function renderStatusBadge(label: string, tone: EmailBadgeTone = 'info'): string {
  const { bg, fg } = BADGE_TONE_STYLES[tone];
  return `<span style="display:inline-block;padding:4px 12px;border-radius:999px;background:${bg};color:${fg};font-family:${emailFontFamily};font-size:12px;font-weight:700;">${escapeHtml(label)}</span>`;
}

const BUTTON_TONE_STYLES: Record<EmailButtonTone, { bg: string; bgImage: string; fg: string }> = {
  brand: { bg: emailColors.blue, bgImage: `linear-gradient(100deg, ${emailColors.blue} 0%, ${emailColors.fucsia} 100%)`, fg: emailColors.white },
  whatsapp: { bg: emailColors.whatsapp, bgImage: emailColors.whatsapp, fg: emailColors.white },
};

/**
 * A "bulletproof" table-based button — works even in clients that ignore
 * the gradient background-image, falling back to the solid `bg` color.
 * `href` must already be a trusted, absolute URL built from server config
 * (APP_URL/EMAIL_ASSET_BASE_URL/wa.me) — never anything client-supplied.
 */
export function renderButton(label: string, href: string, tone: EmailButtonTone = 'brand'): string {
  const { bg, bgImage, fg } = BUTTON_TONE_STYLES[tone];
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0;">
      <tr>
        <td style="border-radius:10px;background-color:${bg};background-image:${bgImage};">
          <a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:13px 26px;font-family:${emailFontFamily};font-size:14px;font-weight:700;color:${fg};text-decoration:none;border-radius:10px;">${escapeHtml(label)}</a>
        </td>
      </tr>
    </table>`;
}

/** A muted callout box for privacy/security/informational notices — text is escaped internally (multiline-safe). */
export function renderNotice(text: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0;">
      <tr>
        <td style="padding:12px 16px;background:${emailColors.gray2};border-left:3px solid ${emailColors.blue};border-radius:8px;font-family:${emailFontFamily};font-size:12.5px;line-height:1.5;color:${emailColors.grafito};">
          ${escapeHtmlMultiline(text)}
        </td>
      </tr>
    </table>`;
}
