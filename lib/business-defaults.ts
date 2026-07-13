// Fallback BusinessSettings values, used by
// modules/business-settings/service.ts's getEffectiveBusinessSettings()
// only until a SUPERADMIN saves real settings via /admin/settings (Fase
// 6, task 6.16) — at that point the persisted row takes over. Matches the
// defaults specified in design.md ("Modelo de datos").
export const businessDefaults = {
  requestRetentionMonths: 12,
  dataRightsRetentionMonths: 12,
  notificationEmail: 'pepivision360@gmail.com',
} as const;
