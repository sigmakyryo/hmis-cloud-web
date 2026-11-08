import { NextResponse } from "next/server";
import { describe, expect, it } from "vitest";

import { applySecurityHeaders } from "@/lib/security-headers";

describe("applySecurityHeaders", () => {
  it("allows the camera on this site and keeps the microphone off", () => {
    const response = applySecurityHeaders(NextResponse.next());

    expect(response.headers.get("Permissions-Policy")).toBe(
      "camera=(self), microphone=(), geolocation=()",
    );
  });
});
