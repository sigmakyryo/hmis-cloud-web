import { BFF_AUTH_ROUTES, BFF_OCCUPATIONAL_HEALTH_ROUTES } from "@/constants/api";
import { ROUTES } from "@/constants/routes";

const AUTH_BFF_PREFIXES = [
  "/api/auth/signin",
  "/api/auth/signup",
  "/api/auth/session",
  "/api/auth/refresh",
  "/api/auth/logout",
  "/api/auth/me",
  "/api/auth/mfa",
  "/api/auth/sso",
] as const;

export function isAuthBffPath(path: string): boolean {
  return AUTH_BFF_PREFIXES.some((prefix) => path.startsWith(prefix));
}

let isRedirecting = false;

/**
 * Clears auth cookies and sends the user to sign-in when a protected BFF call
 * returns 401. Uses a full navigation so middleware and AuthGuard stay in sync.
 */
export async function handleSessionExpired(): Promise<void> {
  if (typeof window === "undefined" || isRedirecting) {
    return;
  }

  if (window.location.pathname === ROUTES.auth) {
    return;
  }

  isRedirecting = true;

  const { useSessionStore } = await import("@/state/session.store");
  useSessionStore.getState().reset();

  try {
    await fetch(BFF_AUTH_ROUTES.session, {
      method: "DELETE",
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    // Best-effort cookie cleanup before redirect.
  }

  window.location.replace(ROUTES.auth);
}

const PORTAL_BFF_PREFIXES = [
  BFF_OCCUPATIONAL_HEALTH_ROUTES.employerPortal,
  BFF_OCCUPATIONAL_HEALTH_ROUTES.employerPortalPublic,
] as const;

/** BFF routes that run on the company portal session. The clinic login is not involved. */
export function isPortalBffPath(path: string): boolean {
  return PORTAL_BFF_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`));
}

/** Where a signed-out portal visitor lands: their company's sign-in, never the clinic app. */
export function portalSignInPath(pathname: string): string {
  const match = pathname.match(/^\/portal\/([a-z0-9]+(?:-[a-z0-9]+)*)(?:\/|$)/);
  return match ? `/portal/${match[1]}` : ROUTES.employerPortalSignIn;
}

let isRedirectingPortal = false;

/**
 * A portal call came back 401. Ends only the portal session and returns to the portal sign-in.
 * The clinic cookies, session store and sign-in page are left alone.
 */
export async function handlePortalSessionExpired(): Promise<void> {
  if (typeof window === "undefined" || isRedirectingPortal) {
    return;
  }

  const destination = portalSignInPath(window.location.pathname);
  if (window.location.pathname === destination) {
    return;
  }

  isRedirectingPortal = true;

  try {
    await fetch(`${BFF_OCCUPATIONAL_HEALTH_ROUTES.employerPortalPublic}/session`, {
      method: "DELETE",
      credentials: "include",
      cache: "no-store",
    });
  } catch (error) {
    console.warn("Could not clear the portal session before redirecting.", error);
  }

  window.location.replace(destination);
}

/** Routes a 401 to the right session: portal calls end the portal session, everything else the clinic one. */
export async function handleBffUnauthorized(path: string): Promise<void> {
  if (isPortalBffPath(path)) {
    await handlePortalSessionExpired();
    return;
  }
  if (!isAuthBffPath(path)) {
    await handleSessionExpired();
  }
}
