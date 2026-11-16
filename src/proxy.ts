import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { ACCESS_TOKEN_COOKIE, PORTAL_SESSION_COOKIE, REFRESH_TOKEN_COOKIE } from "@/constants/session";
import {
  getAppHost,
  getMarketingHost,
  getPortalHost,
  isAppHostname,
  isHostRoutingEnabled,
  isMarketingHostname,
  isPortalHostname,
  isPrivateNetworkHostname,
  requestHostname,
} from "@/constants/hosts";
import { PROTECTED_ROUTES, ROUTES } from "@/constants/routes";
import { applySecurityHeaders } from "@/lib/security-headers";
import {
  isAppRoute,
  isMarketingRoute,
  matchesRoute,
} from "@/lib/route-matching";

function hasSession(request: NextRequest): boolean {
  const access = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refresh = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  return Boolean(access && refresh);
}

function hasPortalSession(request: NextRequest): boolean {
  return Boolean(request.cookies.get(PORTAL_SESSION_COOKIE)?.value);
}

function requestProtocol(request: NextRequest): "http" | "https" {
  const forwarded = request.headers.get("x-forwarded-proto");
  if (forwarded === "http" || forwarded === "https") {
    return forwarded;
  }

  return request.nextUrl.protocol === "http:" ? "http" : "https";
}

function redirectToHost(
  request: NextRequest,
  host: string,
  pathname: string,
  status: 307 | 308,
) {
  const destination = new URL(
    `${pathname}${request.nextUrl.search}`,
    `${requestProtocol(request)}://${host}`,
  );
  return applySecurityHeaders(NextResponse.redirect(destination, status));
}

function redirectSameOrigin(request: NextRequest, pathname: string) {
  const destination = request.nextUrl.clone();
  destination.pathname = pathname;
  return applySecurityHeaders(NextResponse.redirect(destination));
}

function isCompanyPortalRoute(pathname: string) {
  return (
    pathname === ROUTES.employerPortal ||
    pathname.startsWith(`${ROUTES.employerPortal}/`) ||
    pathname === ROUTES.employerPortalJoin ||
    pathname.startsWith(`${ROUTES.employerPortalJoin}/`) ||
    pathname === ROUTES.employerPortalSignIn ||
    pathname === "/portal" ||
    pathname.startsWith("/portal/")
  );
}

function gateCompanyPortal(request: NextRequest, pathname: string, signedIn: boolean) {
  const match = pathname.match(/^\/portal\/([a-z0-9]+(?:-[a-z0-9]+)*)(\/.*)?$/);
  if (match) {
    const workspace = match[1] ?? "";
    const rest = match[2] ?? "";
    const isPublic = rest === "" || rest === "/join" || rest.startsWith("/join/");
    if (!signedIn && !isPublic) {
      return redirectSameOrigin(request, `/portal/${workspace}`);
    }
    if (signedIn && rest === "") {
      return redirectSameOrigin(request, `/portal/${workspace}/fitness`);
    }
    return null;
  }
  if (
    pathname === ROUTES.employerPortalJoin ||
    pathname.startsWith(`${ROUTES.employerPortalJoin}/`)
  ) {
    return null;
  }
  if (pathname === ROUTES.employerPortalSignIn) {
    return signedIn ? redirectSameOrigin(request, ROUTES.employerPortal) : null;
  }
  if (!signedIn) {
    return redirectSameOrigin(request, ROUTES.employerPortalSignIn);
  }
  return null;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestPort = request.nextUrl.port || undefined;
  const appHost = getAppHost(requestPort);
  const marketingHost = getMarketingHost(requestPort);
  const portalHost = getPortalHost(requestPort);
  const host = requestHostname(
    request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
  );
  const onPortalHost = Boolean(portalHost && isPortalHostname(host, portalHost));
  const companyPortal = isCompanyPortalRoute(pathname);
  const portalSession = hasPortalSession(request);
  const sessionActive = companyPortal ? portalSession : hasSession(request);
  const hostRouting =
    isHostRoutingEnabled(appHost, marketingHost) &&
    !isPrivateNetworkHostname(host);

  if (onPortalHost && !pathname.startsWith("/api") && appHost) {
    return redirectToHost(request, appHost, pathname, 308);
  }

  if (hostRouting) {
    if (isMarketingHostname(host, marketingHost) && isAppRoute(pathname)) {
      const nextPath = pathname === "/signup" ? ROUTES.signup : pathname;
      return redirectToHost(request, appHost, nextPath, 308);
    }

    if (isAppHostname(host, appHost)) {
      if (pathname === "/") {
        return redirectSameOrigin(
          request,
          sessionActive ? ROUTES.postAuth : ROUTES.auth,
        );
      }

      if (isMarketingRoute(pathname)) {
        return redirectToHost(request, marketingHost, pathname, 308);
      }
    }
  }

  if (companyPortal) {
    const gated = gateCompanyPortal(request, pathname, portalSession);
    if (gated) {
      return gated;
    }
    return applySecurityHeaders(NextResponse.next());
  }

  const isProtectedRoute = matchesRoute(pathname, PROTECTED_ROUTES);

  if (isProtectedRoute && !sessionActive) {
    const loginUrl = hostRouting
      ? new URL(
          `${ROUTES.auth}${request.nextUrl.search}`,
          `${requestProtocol(request)}://${appHost}`,
        )
      : new URL(ROUTES.auth, request.url);
    return applySecurityHeaders(NextResponse.redirect(loginUrl));
  }

  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
