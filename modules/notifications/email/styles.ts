/**
 * Brand palette, copied verbatim from app/globals.css's `@theme inline`
 * block — the single source of truth for Pepi Visión 360's colors. Email
 * clients never load the app's stylesheet, so every value used in HTML
 * email has to be duplicated here as an inline-style-ready constant
 * instead of a CSS variable reference.
 */
export const emailColors = {
  navy: '#16265f',
  navy2: '#1b2f74',
  footer: '#0f1a44',
  blue: '#1668c8',
  blueEl: '#1f8bff',
  fucsia: '#e5127d',
  rosado: '#f65ba8',
  ink: '#1a2350',
  grafito: '#4a5170',
  gray: '#f4f6fb',
  gray2: '#e8edf7',
  line: '#e2e8f4',
  whatsapp: '#25d366',
  error: '#c8305b',
  errorBg: '#fdecef',
  success: '#1fae5a',
  successBg: '#e9f9ef',
  white: '#ffffff',
} as const;

// No Google Fonts / self-hosted app fonts here on purpose — most email
// clients strip @font-face and remote font requests entirely. This is the
// same safe stack the brief asks for, applied everywhere in these templates.
export const emailFontFamily = 'Arial, Helvetica, sans-serif';

export const EMAIL_MAX_WIDTH = 600;
