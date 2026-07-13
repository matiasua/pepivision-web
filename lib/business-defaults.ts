// Placeholder BusinessSettings values (retention periods, business contact
// for notifications) until the admin panel can persist and edit a real
// `BusinessSettings` row — that requires admin-auth (Fase 6). Matches the
// defaults specified in design.md ("Modelo de datos").
export const businessDefaults = {
  requestRetentionMonths: 12,
  dataRightsRetentionMonths: 12,
  notificationEmail: 'pepivision360@gmail.com',
} as const;
