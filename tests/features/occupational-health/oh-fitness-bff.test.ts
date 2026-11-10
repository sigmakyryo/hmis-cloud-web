import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  ohServiceRequest: vi.fn(),
  requireAccessToken: vi.fn(),
}));

vi.mock("@/lib/server/oh-service", () => ({
  OH_SERVICE_URL: "http://ohs.test/api",
  ohServiceRequest: (...args: unknown[]) => mocks.ohServiceRequest(...args),
}));
vi.mock("@/lib/server/require-access-token", () => ({
  requireAccessToken: () => mocks.requireAccessToken(),
}));
vi.mock("@/lib/server/bff-response", () => ({
  bffSuccess: (data: unknown, status = 200) => Response.json(data, { status }),
  bffError: (error: unknown) =>
    Response.json({ message: error instanceof Error ? error.message : "error" }, { status: 500 }),
}));

import { fitnessProxy } from "@/lib/server/fitness-bff";

const UUID = "0b7c3f9e-1d2a-4c5b-8e6f-7a8b9c0d1e2f";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAccessToken.mockResolvedValue({ accessToken: "session-token" });
});

describe("fitness BFF allowlist", () => {
  it("allows known endpoints and blocks the signed feeds and unknown paths", () => {
    expect(fitnessProxy.resolve("GET", ["board"])?.path).toBe("/oh-fit/board");
    expect(fitnessProxy.resolve("GET", ["workers", UUID])?.path).toBe(`/oh-fit/workers/${UUID}`);
    expect(fitnessProxy.resolve("POST", ["training", UUID, "revoke"])).not.toBeNull();
    expect(fitnessProxy.resolve("PATCH", ["clients", UUID])).not.toBeNull();
    expect(fitnessProxy.resolve("GET", ["feed", "payroll"])).toBeNull();
    expect(fitnessProxy.resolve("POST", ["board"])).toBeNull();
    expect(fitnessProxy.resolve("GET", ["workers", ".."])).toBeNull();
    expect(fitnessProxy.resolve("GET", [])).toBeNull();
  });

  it("keeps only allowed query keys", () => {
    const query = fitnessProxy.query(new Request("http://x/api?status=not_fit&site=North&token=abc&evil=1"));
    expect(query).toBe("?site=North&status=not_fit");
  });

  it("forwards with the session token and answers 201 on create", async () => {
    mocks.ohServiceRequest.mockResolvedValue({ uuid: UUID });
    const res = await fitnessProxy.proxy(
      "POST",
      new Request("http://x/api", { method: "POST", body: JSON.stringify({ name: "Gate", scopes: ["access_cards"] }) }),
      ["clients"],
    );
    expect(res.status).toBe(201);
    expect(mocks.ohServiceRequest).toHaveBeenCalledWith("/oh-fit/clients", {
      method: "POST",
      token: "session-token",
      body: { name: "Gate", scopes: ["access_cards"] },
    });
  });

  it("returns 404 without calling OHS for blocked paths", async () => {
    const res = await fitnessProxy.proxy("GET", new Request("http://x/api"), ["feed", "rosters"]);
    expect(res.status).toBe(404);
    expect(mocks.ohServiceRequest).not.toHaveBeenCalled();
  });
});
