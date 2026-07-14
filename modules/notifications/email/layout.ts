import { LOGO_URL, PRIVACY_POLICY_URL, SITE_URL } from './config';
import { emailColors, emailFontFamily, EMAIL_MAX_WIDTH } from './styles';
import { escapeHtml } from './components';

export interface FooterContactInfo {
  phoneDisplay: string;
  email: string;
  instagramHandle: string;
  hoursText: string;
  locationText: string;
}

/** Logo + brand gradient band — kept as plain, always-visible text alongside the image so the header still reads clearly with images blocked. */
export function renderEmailHeader(): string {
  return `
    <tr>
      <td style="padding:28px 30px 18px;text-align:center;background:${emailColors.white};">
        <img
          src="${escapeHtml(LOGO_URL)}"
          width="64"
          height="64"
          alt="Pepi Visión 360"
          style="display:block;margin:0 auto 10px;border:0;outline:none;border-radius:14px;"
        />
        <div style="font-family:${emailFontFamily};font-size:18px;font-weight:700;color:${emailColors.navy};letter-spacing:0.01em;">
          Pepi Visión 360
        </div>
      </td>
    </tr>
    <tr>
      <td style="height:4px;line-height:4px;font-size:0;background-color:${emailColors.blue};background-image:linear-gradient(100deg, ${emailColors.blue} 0%, ${emailColors.fucsia} 100%);">&nbsp;</td>
    </tr>`;
}

/** Corporate footer — contact info comes from BusinessSettings (or its site-config/business-defaults fallback), never hardcoded. */
export function renderEmailFooter(contact: FooterContactInfo): string {
  return `
    <tr>
      <td style="padding:26px 30px 30px;background:${emailColors.gray};border-top:1px solid ${emailColors.line};">
        <div style="font-family:${emailFontFamily};font-size:13px;font-weight:700;color:${emailColors.navy};">Pepi Visión 360</div>
        <div style="margin-top:2px;font-family:${emailFontFamily};font-size:12px;color:${emailColors.grafito};font-style:italic;">Ver bien nunca fue tan fácil</div>
        <div style="margin-top:12px;font-family:${emailFontFamily};font-size:12px;line-height:1.8;color:${emailColors.grafito};">
          WhatsApp / Teléfono: ${escapeHtml(contact.phoneDisplay)}<br>
          Correo: ${escapeHtml(contact.email)}<br>
          Instagram: @${escapeHtml(contact.instagramHandle)}<br>
          Horario: ${escapeHtml(contact.hoursText)}<br>
          Ubicación: ${escapeHtml(contact.locationText)}
        </div>
        <div style="margin-top:14px;font-family:${emailFontFamily};font-size:11.5px;line-height:1.6;color:#93a0bd;">
          <a href="${escapeHtml(SITE_URL)}" target="_blank" rel="noopener noreferrer" style="color:${emailColors.blue};text-decoration:none;">pepivision360</a>
          &nbsp;·&nbsp;
          <a href="${escapeHtml(PRIVACY_POLICY_URL)}" target="_blank" rel="noopener noreferrer" style="color:${emailColors.blue};text-decoration:none;">Política de privacidad</a>
          <br>
          Este es un correo automático generado por una solicitud realizada en el sitio; no es necesario responderlo directamente.
        </div>
      </td>
    </tr>`;
}

/**
 * Full HTML document: preheader + centered 600px table "email client"
 * around the header/body/footer. Table-based on purpose (see
 * modules/notifications/email/README or design.md) — flexbox/grid aren't
 * reliable structural primitives across real email clients.
 */
export function renderEmailLayout(params: { preheader: string; bodyHtml: string; footerHtml: string }): string {
  const { preheader, bodyHtml, footerHtml } = params;
  return `<!doctype html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <title>Pepi Visión 360</title>
  </head>
  <body style="margin:0;padding:0;background:${emailColors.gray};font-family:${emailFontFamily};">
    <div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:${emailColors.gray};">
      ${escapeHtml(preheader)}
      ${'&zwnj;&nbsp;'.repeat(40)}
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${emailColors.gray};">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" width="${EMAIL_MAX_WIDTH}" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:${EMAIL_MAX_WIDTH}px;background:${emailColors.white};border-radius:18px;overflow:hidden;box-shadow:0 4px 20px rgba(22,38,95,0.08);">
            ${renderEmailHeader()}
            <tr>
              <td style="padding:26px 30px 6px;">
                ${bodyHtml}
              </td>
            </tr>
            ${footerHtml}
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
