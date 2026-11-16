export const ACCESS_TOKEN_COOKIE = "hmis_access";
export const REFRESH_TOKEN_COOKIE = "hmis_refresh";
/** Company portal session. Not a clinic login. */
export const PORTAL_SESSION_COOKIE = "oh_portal_session";

/** 7 days — aligned with typical refresh token rotation windows. */
export const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
