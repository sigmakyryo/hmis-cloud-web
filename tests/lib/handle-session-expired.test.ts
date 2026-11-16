import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ROUTES } from "@/constants/routes";
import {
  handleBffUnauthorized,
  handlePortalSessionExpired,
  handleSessionExpired,
  isAuthBffPath,
  isPortalBffPath,
  portalSignInPath,
} from "@/lib/handle-session-expired";

describe("isAuthBffPath", () => {
  it("identifies auth BFF routes", () => {
    expect(isAuthBffPath("/api/auth/session")).toBe(true);
    expect(isAuthBffPath("/api/auth/signin/request-otp")).toBe(true);
    expect(isAuthBffPath("/api/auth/mfa")).toBe(true);
    expect(isAuthBffPath("/api/customers")).toBe(false);
  });
});

describe("handleSessionExpired", () => {
  const replace = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    vi.stubGlobal("location", {
      pathname: "/customers",
      replace,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("clears the session and redirects to auth", async () => {
    await handleSessionExpired();

    expect(fetch).toHaveBeenCalledWith("/api/auth/session", {
      method: "DELETE",
      credentials: "include",
      cache: "no-store",
    });
    expect(replace).toHaveBeenCalledWith(ROUTES.auth);
  });
});

describe("company portal sessions", () => {
  const replace = vi.fn();

  beforeEach(() => {
    replace.mockReset();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("tells portal routes apart from clinic routes", () => {
    expect(isPortalBffPath("/api/employer-portal/invoices")).toBe(true);
    expect(isPortalBffPath("/api/employer-portal-public/session")).toBe(true);
    expect(isPortalBffPath("/api/occupational-health/employer-portal-admin/contacts")).toBe(false);
    expect(isPortalBffPath("/api/customers")).toBe(false);
  });

  it("sends a signed-out visitor to their own company sign-in", () => {
    expect(portalSignInPath("/portal/sigma-12/invoices")).toBe("/portal/sigma-12");
    expect(portalSignInPath("/portal/sigma-12")).toBe("/portal/sigma-12");
    expect(portalSignInPath("/employer-portal/fitness")).toBe(ROUTES.employerPortalSignIn);
  });

  it("ends only the portal session when a portal call is unauthorised", async () => {
    vi.stubGlobal("location", { pathname: "/portal/sigma-12/invoices", replace });
    await handleBffUnauthorized("/api/employer-portal/invoices");

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith("/api/employer-portal-public/session", {
      method: "DELETE",
      credentials: "include",
      cache: "no-store",
    });
    expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).startsWith("/api/auth"))).toBe(false);
    expect(replace).toHaveBeenCalledWith("/portal/sigma-12");
    expect(replace).not.toHaveBeenCalledWith(ROUTES.auth);
  });

  it("does not loop when the visitor is already on the sign-in page", async () => {
    vi.stubGlobal("location", { pathname: ROUTES.employerPortalSignIn, replace });
    await handlePortalSessionExpired();
    expect(replace).not.toHaveBeenCalled();
  });

  it("still ends the clinic session for clinic routes", async () => {
    vi.stubGlobal("location", { pathname: "/customers", replace });
    await handleBffUnauthorized("/api/customers");
    expect(replace).toHaveBeenCalledWith(ROUTES.auth);
  });
});
