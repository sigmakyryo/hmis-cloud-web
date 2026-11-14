import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ ohServiceRequest: vi.fn(), requireAccessToken: vi.fn() }));

vi.mock("@/lib/server/oh-service", () => ({
  OH_SERVICE_URL: "http://ohs.test/api",
  ohServiceRequest: (...args: unknown[]) => mocks.ohServiceRequest(...args),
}));
vi.mock("@/lib/server/require-access-token", () => ({ requireAccessToken: () => mocks.requireAccessToken() }));
vi.mock("@/lib/server/bff-response", () => ({
  bffSuccess: (data: unknown, status = 200) => Response.json(data, { status }),
  bffError: (error: unknown) => Response.json({ message: error instanceof Error ? error.message : "error" }, { status: 500 }),
}));

import { exposureProxy } from "@/lib/server/exposure-bff";

const UUID = "0b7c3f9e-1d2a-4c5b-8e6f-7a8b9c0d1e2f";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAccessToken.mockResolvedValue({ accessToken: "session-token" });
});

describe("exposure BFF allowlist", () => {
  it("allows the module endpoints and maps them under oh-exp", () => {
    expect(exposureProxy.resolve("GET", ["dashboard"])?.path).toBe("/oh-exp/dashboard");
    expect(exposureProxy.resolve("GET", ["groups", UUID, "series"])?.path).toBe(`/oh-exp/groups/${UUID}/series`);
    expect(exposureProxy.resolve("GET", ["events", "by-iod", UUID])?.path).toBe(`/oh-exp/events/by-iod/${UUID}`);
    expect(exposureProxy.resolve("POST", ["measurements", "import", "preview"])).not.toBeNull();
    expect(exposureProxy.resolve("PUT", ["limits", UUID])).not.toBeNull();
    expect(exposureProxy.resolve("PUT", ["groups", UUID, "agents", UUID])).not.toBeNull();
    expect(exposureProxy.resolve("DELETE", ["limits", UUID])).not.toBeNull();
    expect(exposureProxy.resolve("GET", ["incidents"])?.path).toBe("/oh-exp/incidents");
  });

  it("blocks unknown paths, wrong methods and traversal", () => {
    expect(exposureProxy.resolve("GET", ["secrets"])).toBeNull();
    expect(exposureProxy.resolve("DELETE", ["groups", UUID])).toBeNull();
    expect(exposureProxy.resolve("POST", ["dashboard"])).toBeNull();
    expect(exposureProxy.resolve("GET", ["groups", ".."])).toBeNull();
    expect(exposureProxy.resolve("GET", [])).toBeNull();
  });

  it("keeps only allowed query keys", () => {
    const query = exposureProxy.query(new Request("http://x/api?severity=critical&token=abc&evil=1&overdue=1"));
    expect(query).toBe("?severity=critical&overdue=1");
  });

  it("forwards with the session token and answers 201 on create", async () => {
    mocks.ohServiceRequest.mockResolvedValue({ uuid: UUID });
    const res = await exposureProxy.proxy(
      "POST",
      new Request("http://x/api", { method: "POST", body: JSON.stringify({ code: "NOISE" }) }),
      ["agents"],
    );
    expect(res.status).toBe(201);
    expect(mocks.ohServiceRequest).toHaveBeenCalledWith("/oh-exp/agents", { method: "POST", token: "session-token", body: { code: "NOISE" } });
  });

  it("forwards PUT bodies", async () => {
    mocks.ohServiceRequest.mockResolvedValue({ uuid: UUID });
    await exposureProxy.proxy("PUT", new Request("http://x/api", { method: "PUT", body: JSON.stringify({ value: 85 }) }), ["limits", UUID]);
    expect(mocks.ohServiceRequest).toHaveBeenCalledWith(`/oh-exp/limits/${UUID}`, { method: "PUT", token: "session-token", body: { value: 85 } });
  });
});
