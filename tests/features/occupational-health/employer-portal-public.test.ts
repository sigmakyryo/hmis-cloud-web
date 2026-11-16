import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ ohServiceRequest: vi.fn(), requireAccessToken: vi.fn() }));

vi.mock("@/lib/server/oh-service", () => ({
  OH_SERVICE_URL: "http://ohs.test/api",
  ohServiceRequest: (...args: unknown[]) => mocks.ohServiceRequest(...args),
}));
vi.mock("@/lib/server/require-access-token", () => ({
  requireAccessToken: () => mocks.requireAccessToken(),
}));

import { employerPortalAdminProxy, employerPortalProxy } from "@/lib/server/employer-portal-bff";
import { handlePublicPortal, resolvePublicPortalPath } from "@/lib/server/employer-portal-public";

const UUID = "0b7c3f9e-1d2a-4c5b-8e6f-7a8b9c0d1e2f";
const TOKEN = "abcDEF0123456789_-abcDEF0123456789_-abcDE";

beforeEach(() => vi.clearAllMocks());

describe("employer portal public BFF", () => {
  it("allows branding, invitation lookup, accept and company sign-in", () => {
    const q = (s: string) => new URLSearchParams(s);
    expect(resolvePublicPortalPath("GET", ["branding", UUID], q(""))?.path).toBe(`/oh-portal-public/branding/${UUID}`);
    expect(resolvePublicPortalPath("GET", ["invitation"], q(`token=${TOKEN}`))?.path).toBe(
      `/oh-portal-public/invitation?token=${TOKEN}`,
    );
    expect(resolvePublicPortalPath("POST", ["invitation", "accept"], q(""))?.method).toBe("POST");
    expect(resolvePublicPortalPath("POST", ["session"], q(""))?.path).toBe("/oh-portal-public/session");
    expect(resolvePublicPortalPath("GET", ["invitation"], q("token=short"))).toBeNull();
    expect(resolvePublicPortalPath("GET", ["branding", "../me"], q(""))).toBeNull();
    expect(resolvePublicPortalPath("POST", ["branding", UUID], q(""))).toBeNull();
    expect(resolvePublicPortalPath("GET", ["me"], q(""))).toBeNull();
  });

  it("forwards only token, name and password and never a session", async () => {
    mocks.ohServiceRequest.mockResolvedValue({ email: "a@b.test" });
    const req = new Request("http://web.test/api/employer-portal-public/invitation/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: TOKEN, password: "longenough", name: "A", is_admin: true }),
    });
    const res = await handlePublicPortal(req, ["invitation", "accept"]);
    expect(res.status).toBe(200);
    const [path, opts] = mocks.ohServiceRequest.mock.calls[0];
    expect(path).toBe("/oh-portal-public/invitation/accept");
    expect(opts.token).toBeUndefined();
    expect(opts.body).toEqual({ token: TOKEN, password: "longenough", name: "A" });
  });

  it("keeps the company portal token in a cookie and off the clinic session", async () => {
    mocks.ohServiceRequest.mockResolvedValue({ token: "portal-token", email: "a@b.test", name: "A" });
    const req = new Request("http://web.test/api/employer-portal-public/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "a@b.test", password: "secret", tenant_uuid: UUID, is_admin: true }),
    });
    const res = await handlePublicPortal(req, ["session"]);
    expect(res.status).toBe(200);
    const [path, opts] = mocks.ohServiceRequest.mock.calls[0];
    expect(path).toBe("/oh-portal-public/session");
    expect(opts.token).toBeUndefined();
    expect(opts.body).toEqual({ email: "a@b.test", password: "secret", tenant_uuid: UUID });
    const payload = (await res.json()) as { data: { token?: string; email: string } };
    expect(payload.data.token).toBeUndefined();
    expect(payload.data.email).toBe("a@b.test");
    expect(res.headers.get("set-cookie")).toContain("oh_portal_session=portal-token");
  });

  it("returns 404 for paths outside the allowlist", async () => {
    const res = await handlePublicPortal(new Request("http://web.test/x"), ["oh-portal", "me"]);
    expect(res.status).toBe(404);
    expect(mocks.ohServiceRequest).not.toHaveBeenCalled();
  });
});

describe("employer portal BFF allowlists (invitations, branding, invoice PDF)", () => {
  it("serves the invoice statement as a PDF download", () => {
    const r = employerPortalProxy.resolve("GET", ["invoices", UUID, "pdf"]);
    expect(r?.path).toBe(`/oh-portal/invoices/${UUID}/pdf`);
    expect(r?.binary?.type).toBe("application/pdf");
  });

  it("allows invitation and branding admin endpoints only by their methods", () => {
    expect(employerPortalAdminProxy.resolve("GET", ["invitations"])).not.toBeNull();
    expect(employerPortalAdminProxy.resolve("POST", ["invitations"])).not.toBeNull();
    expect(employerPortalAdminProxy.resolve("POST", ["invitations", UUID, "revoke"])).not.toBeNull();
    expect(employerPortalAdminProxy.resolve("PATCH", ["branding"])).not.toBeNull();
    expect(employerPortalAdminProxy.resolve("PATCH", ["invitations", UUID])).toBeNull();
    expect(employerPortalProxy.resolve("GET", ["invitations"])).toBeNull();
  });
});
