import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/oh-service", () => ({ OH_SERVICE_URL: "http://ohs.test/api", ohServiceRequest: vi.fn() }));
vi.mock("@/lib/server/require-access-token", () => ({ requireAccessToken: vi.fn() }));

import { ohHomeProxy } from "@/lib/server/oh-home-bff";

describe("OH home BFF allowlist", () => {
  it.each(["clinic", "immunizations", "drug-alcohol", "fitness", "health-programs", "exposure-management"])("maps %s to oh-home", (module) => {
    expect(ohHomeProxy.resolve("GET", [module])?.path).toBe(`/oh-home/${module}`);
  });

  it("is read only and only knows the six modules", () => {
    expect(ohHomeProxy.resolve("POST", ["clinic"])).toBeNull();
    expect(ohHomeProxy.resolve("GET", ["payroll"])).toBeNull();
    expect(ohHomeProxy.resolve("GET", ["clinic", "extra"])).toBeNull();
    expect(ohHomeProxy.resolve("GET", [".."])).toBeNull();
  });
});
