// Thin barrel over modules/notifications/email/templates/* — kept as the
// stable import path every caller (modules/requests, modules/data-rights)
// already uses, so the HTML-template rework didn't need to touch import
// paths across the codebase. The actual template logic (HTML + text +
// subject + preheader) lives in modules/notifications/email/.
export { quoteCustomerConfirmation } from './email/templates/quote-customer-confirmation';
export type { QuoteCustomerConfirmationInput } from './email/templates/quote-customer-confirmation';

export { quoteBusinessNotification } from './email/templates/quote-business-notification';
export type { QuoteBusinessNotificationInput } from './email/templates/quote-business-notification';

export { homeVisitCustomerConfirmation } from './email/templates/home-visit-customer-confirmation';
export type { HomeVisitCustomerConfirmationInput } from './email/templates/home-visit-customer-confirmation';

export { homeVisitBusinessNotification } from './email/templates/home-visit-business-notification';
export type { HomeVisitBusinessNotificationInput } from './email/templates/home-visit-business-notification';

export { dataRightsBusinessNotification } from './email/templates/data-rights-business-notification';
export type { DataRightsBusinessNotificationInput } from './email/templates/data-rights-business-notification';
