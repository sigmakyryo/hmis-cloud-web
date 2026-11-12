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

import {
  drugAlcoholProxy,
  drugAlcoholQuery,
  resolveDrugAlcoholPath,
} from "@/lib/server/drug-alcohol-bff";

const UUID = "0b7c3f9e-1d2a-4c5b-8e6f-7a8b9c0d1e2f";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAccessToken.mockResolvedValue({ accessToken: "session-token" });
});

describe("drug & alcohol BFF allowlist", () => {
  it("allows known OHS endpoints by method", () => {
    expect(resolveDrugAlcoholPath("GET", ["due"])?.path).toBe("/oh-da/due");
    expect(resolveDrugAlcoholPath("GET", ["visits", UUID, "panel"])?.path).toBe(`/oh-da/visits/${UUID}/panel`);
    expect(resolveDrugAlcoholPath("POST", ["tests", UUID, "custody"])?.path).toBe(`/oh-da/tests/${UUID}/custody`);
    expect(resolveDrugAlcoholPath("POST", ["mro", UUID, "verify"])).not.toBeNull();
    expect(resolveDrugAlcoholPath("PATCH", ["pools", UUID])).not.toBeNull();
  });

  it("never proxies the signed lab callback or unknown paths", () => {
    expect(resolveDrugAlcoholPath("POST", ["lab", "callback"])).toBeNull();
    expect(resolveDrugAlcoholPath("GET", ["lab", "callback"])).toBeNull();
    expect(resolveDrugAlcoholPath("GET", ["tests", "..", "secrets"])).toBeNull();
    expect(resolveDrugAlcoholPath("GET", ["tests", "a/b"])).toBeNull();
    expect(resolveDrugAlcoholPath("POST", ["due"])).toBeNull();
    expect(resolveDrugAlcoholPath("PATCH", ["policies", UUID])).toBeNull();
    expect(resolveDrugAlcoholPath("GET", [])).toBeNull();
  });

  it("marks PDFs and CSV as binary downloads", () => {
    expect(resolveDrugAlcoholPath("GET", ["tests", UUID, "ccf.pdf"])?.binary?.type).toBe("application/pdf");
    expect(resolveDrugAlcoholPath("GET", ["reports.csv"])?.binary?.type).toContain("text/csv");
    expect(resolveDrugAlcoholPath("GET", ["reports"])?.binary).toBeNull();
  });

  it("forwards only allowlisted query keys", () => {
    const query = drugAlcoholQuery(new Request("http://web.test/x?within=14&kind=random&evil=1&customer_uuid=abc"));
    expect(query).toContain("within=14");
    expect(query).toContain("kind=random");
    expect(query).toContain("customer_uuid=abc");
    expect(query).not.toContain("evil");
  });
});

describe("drug & alcohol BFF proxy", () => {
  it("passes Laravel objects through unchanged", async () => {
    mocks.ohServiceRequest.mockResolvedValue({ rows: [], counts: { total: 0 } });
    const response = await drugAlcoholProxy("GET", new Request("http://web.test/api?within=7"), ["due"]);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ rows: [], counts: { total: 0 } });
    expect(mocks.ohServiceRequest).toHaveBeenCalledWith("/oh-da/due?within=7", expect.objectContaining({ method: "GET", token: "session-token" }));
  });

  it("sends JSON bodies for writes", async () => {
    mocks.ohServiceRequest.mockResolvedValue({ uuid: UUID });
    const request = new Request("http://web.test/api", { method: "POST", body: JSON.stringify({ consent_given: true }) });
    await drugAlcoholProxy("POST", request, ["tests", UUID, "consent"]);
    expect(mocks.ohServiceRequest).toHaveBeenCalledWith(
      `/oh-da/tests/${UUID}/consent`,
      expect.objectContaining({ method: "POST", body: { consent_given: true } }),
    );
  });

  it("returns 404 for disallowed paths without calling OHS", async () => {
    const response = await drugAlcoholProxy("POST", new Request("http://web.test/api", { method: "POST" }), ["lab", "callback"]);
    expect(response.status).toBe(404);
    expect(mocks.ohServiceRequest).not.toHaveBeenCalled();
    expect(mocks.requireAccessToken).not.toHaveBeenCalled();
  });

  it("streams the custody form PDF", async () => {
    const fetchMock = vi.fn(async () => new Response(new Uint8Array([37, 80, 68, 70]), { status: 200, headers: { "Content-Type": "application/pdf" } }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await drugAlcoholProxy("GET", new Request("http://web.test/api"), ["tests", UUID, "ccf.pdf"]);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(fetchMock).toHaveBeenCalledWith(`http://ohs.test/api/oh-da/tests/${UUID}/ccf.pdf`, expect.anything());
    vi.unstubAllGlobals();
  });
});
