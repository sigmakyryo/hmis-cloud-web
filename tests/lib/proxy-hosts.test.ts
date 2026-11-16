import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ACCESS_TOKEN_COOKIE, PORTAL_SESSION_COOKIE, REFRESH_TOKEN_COOKIE } from "@/constants/session";
import { proxy } from "@/proxy";

function request(
  url: string,
  host: string,
  cookies?: string,
) {
  return new NextRequest(url, {
    headers: {
      host,
      ...(cookies ? { cookie: cookies } : {}),
    },
  });
}

describe("proxy host routing", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not redirect on localhost when host routing is disabled", () => {
    vi.stubEnv("NEXT_PUBLIC_DISABLE_HOST_ROUTING", "true");
    vi.stubEnv("NEXT_PUBLIC_APP_HOST", "");
    vi.stubEnv("NEXT_PUBLIC_MARKETING_HOST", "");

    const response = proxy(request("http://localhost:3000/customers", "localhost:3000"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/auth");
  });

  it("keeps a LAN address on the same origin", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_APP_HOST", "");
    vi.stubEnv("NEXT_PUBLIC_MARKETING_HOST", "");

    const response = proxy(
      request("http://192.168.1.45:3000/customers", "192.168.1.45:3000"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://192.168.1.45:3000/auth",
    );
  });

  it("sends localhost dashboard URLs to app.localhost in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_APP_HOST", "");
    vi.stubEnv("NEXT_PUBLIC_MARKETING_HOST", "");

    const response = proxy(
      request("http://localhost:3000/customers", "localhost:3000"),
    );

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(
      "http://app.localhost:3000/customers",
    );
  });

  it("sends old dashboard URLs to the app host", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_HOST", "app.sigmahmis.com");
    vi.stubEnv("NEXT_PUBLIC_MARKETING_HOST", "sigmahmis.com");

    const response = proxy(
      request("https://sigmahmis.com/customers/abc", "sigmahmis.com"),
    );

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(
      "https://app.sigmahmis.com/customers/abc",
    );
  });

  it("sends www marketing auth links to the app host", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_HOST", "app.sigmahmis.com");
    vi.stubEnv("NEXT_PUBLIC_MARKETING_HOST", "sigmahmis.com");

    const response = proxy(
      request("https://www.sigmahmis.com/auth", "www.sigmahmis.com"),
    );

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(
      "https://app.sigmahmis.com/auth",
    );
  });

  it("sends the app apex to sign-in when there is no session", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_HOST", "app.sigmahmis.com");
    vi.stubEnv("NEXT_PUBLIC_MARKETING_HOST", "sigmahmis.com");

    const response = proxy(request("https://app.sigmahmis.com/", "app.sigmahmis.com"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://app.sigmahmis.com/auth",
    );
  });

  it("sends a logged-in app apex to clients", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_HOST", "app.sigmahmis.com");
    vi.stubEnv("NEXT_PUBLIC_MARKETING_HOST", "sigmahmis.com");

    const response = proxy(
      request("https://app.sigmahmis.com/", "app.sigmahmis.com", [
        `${ACCESS_TOKEN_COOKIE}=access`,
        `${REFRESH_TOKEN_COOKIE}=refresh`,
      ].join("; ")),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://app.sigmahmis.com/overview",
    );
  });

  it("sends marketing pages on the app host back to marketing", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_HOST", "app.sigmahmis.com");
    vi.stubEnv("NEXT_PUBLIC_MARKETING_HOST", "sigmahmis.com");

    const response = proxy(
      request("https://app.sigmahmis.com/pricing", "app.sigmahmis.com"),
    );

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(
      "https://sigmahmis.com/pricing",
    );
  });

  it("sends an old portal host link to the same path on the app host", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_HOST", "app.sigmahmis.com");
    vi.stubEnv("NEXT_PUBLIC_MARKETING_HOST", "sigmahmis.com");

    const response = proxy(
      request("https://portal.sigmahmis.com/employer-portal-join?token=abc", "portal.sigmahmis.com"),
    );

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(
      "https://app.sigmahmis.com/employer-portal-join?token=abc",
    );
  });

  it("serves a workspace sign-in page on the app host without a portal session", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_HOST", "app.sigmahmis.com");
    vi.stubEnv("NEXT_PUBLIC_MARKETING_HOST", "sigmahmis.com");

    const response = proxy(request("https://app.sigmahmis.com/portal/sigma-clinic-12", "app.sigmahmis.com"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("sends a signed-out workspace page back to that workspace sign-in", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_HOST", "app.sigmahmis.com");
    vi.stubEnv("NEXT_PUBLIC_MARKETING_HOST", "sigmahmis.com");

    const response = proxy(
      request("https://app.sigmahmis.com/portal/sigma-clinic-12/fitness", "app.sigmahmis.com"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://app.sigmahmis.com/portal/sigma-clinic-12");
  });

  it("opens the workspace home on fitness when the portal session exists", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_HOST", "app.sigmahmis.com");
    vi.stubEnv("NEXT_PUBLIC_MARKETING_HOST", "sigmahmis.com");

    const response = proxy(
      request("https://app.sigmahmis.com/portal/sigma-clinic-12", "app.sigmahmis.com", [
        `${PORTAL_SESSION_COOKIE}=portal-token`,
      ].join("; ")),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://app.sigmahmis.com/portal/sigma-clinic-12/fitness");
  });

  it("keeps the workspace join page public", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_HOST", "app.sigmahmis.com");
    vi.stubEnv("NEXT_PUBLIC_MARKETING_HOST", "sigmahmis.com");

    const response = proxy(
      request("https://app.sigmahmis.com/portal/sigma-clinic-12/join?token=abc", "app.sigmahmis.com"),
    );

    expect(response.status).toBe(200);
  });
});
