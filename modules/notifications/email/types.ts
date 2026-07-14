/** The shared shape every notification template must produce — nothing is sent without all four. */
export interface EmailMessage {
  subject: string;
  /** Hidden preview-pane text; never rendered in the visible body. */
  preheader: string;
  html: string;
  text: string;
}

export interface EmailDataRow {
  label: string;
  /** Pre-escaped-or-safe HTML fragment — callers must run untrusted text through escapeHtml() first. */
  value: string;
}

export type EmailBadgeTone = 'success' | 'pending' | 'info';

export type EmailButtonTone = 'brand' | 'whatsapp';
