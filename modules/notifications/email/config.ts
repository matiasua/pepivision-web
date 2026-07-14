import { env } from '@/lib/env';

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

// Never APP_URL's browser-facing counterpart alone — EMAIL_ASSET_BASE_URL
// exists specifically because an email client resolves URLs completely
// independently of whatever host served the page that generated the
// email, and can never reach an internal Docker hostname or a relative
// path. Falls back to APP_URL only because in this project both already
// point at the same public-facing host in every environment configured so
// far (see .env.example).
const ASSET_BASE_URL = stripTrailingSlash(env.EMAIL_ASSET_BASE_URL ?? env.APP_URL);
const APP_BASE_URL = stripTrailingSlash(env.APP_URL);

/** Absolute URL for a /public asset, for use inside email HTML — never a relative path. */
export function buildEmailAssetUrl(path: string): string {
  return `${ASSET_BASE_URL}/${path.replace(/^\/+/, '')}`;
}

/** Absolute URL into the app itself (e.g. an admin route), for CTA buttons in business-facing emails. */
export function buildAppUrl(path: string): string {
  return `${APP_BASE_URL}/${path.replace(/^\/+/, '')}`;
}

export const LOGO_URL = buildEmailAssetUrl('brand/pepi-logo.png');
export const SITE_URL = APP_BASE_URL;
export const PRIVACY_POLICY_URL = buildAppUrl('privacidad');
export const ADMIN_REQUESTS_URL = buildAppUrl('admin/requests');
export const ADMIN_ARCO_URL = buildAppUrl('admin/requests?tab=arco');
export const ADMIN_HOME_VISITS_URL = buildAppUrl('admin/requests?type=HOME_VISIT');
