import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { resolveLogoFetchUrl, toPortalLogoDataUri } from "@/lib/server/portal-logo-sync";

describe("portal logo sync", () => {
  it("turns a large image into a small PNG data URI the OH service accepts", async () => {
    const big = await sharp({ create: { width: 2000, height: 1200, channels: 3, background: "#e05a1b" } }).jpeg().toBuffer();
    const dataUri = await toPortalLogoDataUri(big);
    expect(dataUri).toMatch(/^data:image\\/png;base64,[A-Za-z0-9+/=]+$/);
    expect(dataUri.length).toBeLessThanOrEqual(270_000);
    const out = await sharp(Buffer.from(dataUri.split(",")[1] ?? "", "base64")).metadata();
    expect(Math.max(out.width ?? 0, out.height ?? 0)).toBeLessThanOrEqual(256);
  });

  it("only fetches http(s) logo addresses on public hosts", () => {
    expect(resolveLogoFetchUrl("https://cdn.example.com/logo.png").host).toBe("cdn.example.com");
    expect(() => resolveLogoFetchUrl("file:///etc/passwd")).toThrow();
    expect(() => resolveLogoFetchUrl("javascript:alert(1)")).toThrow();
    expect(() => resolveLogoFetchUrl("http://169.254.169.254/latest")).not.toThrow();
  });

  it("refuses local and private hosts", () => {
    expect(() => resolveLogoFetchUrl("http://localhost:6379/logo.png")).toThrow("public address");
    expect(() => resolveLogoFetchUrl("http://192.168.1.10/logo.png")).toThrow("public address");
    expect(() => resolveLogoFetchUrl("http://10.0.0.5/logo.png")).toThrow("public address");
  });
});
