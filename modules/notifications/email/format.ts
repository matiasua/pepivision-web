const TIME_ZONE = 'America/Santiago';

/** "14 de julio de 2026" — always es-CL / America/Santiago, never the host's system locale. */
export function formatDateCl(date: Date): string {
  return new Intl.DateTimeFormat('es-CL', { dateStyle: 'long', timeZone: TIME_ZONE }).format(date);
}

/** "14 de julio de 2026, 04:20" — same as formatDateCl plus a 24h time. */
export function formatDateTimeCl(date: Date): string {
  return new Intl.DateTimeFormat('es-CL', { dateStyle: 'long', timeStyle: 'short', timeZone: TIME_ZONE }).format(date);
}

/** A short, human-friendly reference for a request id — for display only, never used to look anything up. */
export function shortRequestId(id: string): string {
  return `#${id.slice(-8).toUpperCase()}`;
}

/** 'Ninguno' when empty, otherwise a comma-joined list — used for treatment labels. */
export function formatList(items: string[]): string {
  return items.length > 0 ? items.join(', ') : 'Ninguno';
}
