import { describe, expect, it } from "vitest";

import { buildAuthUrlWithoutCredentials } from "@/lib/auth-url";

describe("buildAuthUrlWithoutCredentials", () => {
  it("removes email and password from the query string", () => {
    expect(
      buildAuthUrlWithoutCredentials(
        "/auth",
        "?email=user%40example.com&password=secret123",
      ),
    ).toBe("/auth");
  });

  it("keeps unrelated query params", () => {
    expect(
      buildAuthUrlWithoutCredentials(
        "/auth",
        "?email=user%40example.com&password=secret123&next=%2Fcustomers",
      ),
    ).toBe("/auth?next=%2Fcustomers");
  });

  it("returns the original url when no sensitive params are present", () => {
    expect(buildAuthUrlWithoutCredentials("/auth", "?next=%2Fcustomers")).toBe(
      "/auth?next=%2Fcustomers",
    );
  });

  it("keeps the SSO continue code so the client can exchange it", () => {
    expect(
      buildAuthUrlWithoutCredentials(
        "/auth/sso/continue",
        "?code=one-time-token&email=user%40example.com",
      ),
    ).toBe("/auth/sso/continue?code=one-time-token");
  });

  it("still strips code on the regular sign-in page", () => {
    expect(buildAuthUrlWithoutCredentials("/auth", "?code=otp-or-leak")).toBe(
      "/auth",
    );
  });
});
