import { ROUTES } from "@/constants/routes";

const SENSITIVE_AUTH_QUERY_KEYS = [
  "email",
  "password",
  "password2",
  "code",
] as const;

/**
 * SSO continue uses a one-time `code` query param. Stripping it before the
 * client exchanges the code cancels the in-flight handoff (searchParams update
 * remounts the effect with an empty code). Keep `code` on that path only.
 */
function keysToStrip(pathname: string): readonly string[] {
  if (
    pathname === ROUTES.authSsoContinue ||
    pathname.startsWith(`${ROUTES.authSsoContinue}/`)
  ) {
    return SENSITIVE_AUTH_QUERY_KEYS.filter((key) => key !== "code");
  }
  return SENSITIVE_AUTH_QUERY_KEYS;
}

export function buildAuthUrlWithoutCredentials(
  pathname: string,
  search: string,
): string {
  if (!search || search === "?") {
    return pathname;
  }

  const params = new URLSearchParams(search);
  let changed = false;

  for (const key of keysToStrip(pathname)) {
    if (params.has(key)) {
      params.delete(key);
      changed = true;
    }
  }

  if (!changed) {
    return `${pathname}${search}`;
  }

  const nextSearch = params.toString();
  return nextSearch ? `${pathname}?${nextSearch}` : pathname;
}

export function stripSensitiveAuthSearchParams(): void {
  if (typeof window === "undefined") {
    return;
  }

  const nextUrl = buildAuthUrlWithoutCredentials(
    window.location.pathname,
    window.location.search,
  );
  const currentUrl = `${window.location.pathname}${window.location.search}`;

  if (nextUrl !== currentUrl) {
    window.history.replaceState(window.history.state, "", nextUrl);
  }
}
