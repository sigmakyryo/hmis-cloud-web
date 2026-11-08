import { beforeEach, expect, it, vi } from "vitest";
import { POST } from "@/app/api/occupational-health/examinations/[uuid]/template-version/route";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), oh: vi.fn() }));
vi.mock("@/lib/server/require-access-token", () => ({ requireAccessToken: mocks.auth }));
vi.mock("@/lib/server/oh-service", () => ({ ohServiceRequest: mocks.oh }));
vi.mock("@/lib/server/bff-response", () => ({ bffSuccess: (data: unknown) => Response.json(data), bffError: () => Response.json({ message: "Could not update examination" }, { status: 409 }) }));
beforeEach(() => { vi.clearAllMocks(); mocks.auth.mockResolvedValue({ accessToken: "synthetic-session" }); mocks.oh.mockResolvedValue({ template_version_uuid: "v2" }); });
function request() { return new Request("http://app.localhost/api/occupational-health/examinations/exam/template-version", { method: "POST", body: JSON.stringify({ row_version: 2, template_version_uuid: "v2" }) }); }
it("forwards exact version and row guards to Laravel without a duplicate path separator", async () => {
  expect((await POST(request(), { params: Promise.resolve({ uuid: "exam" }) })).status).toBe(200);
  expect(mocks.oh).toHaveBeenCalledWith("/oh-examinations/exam/template-version", { method: "POST", token: "synthetic-session", body: { row_version: 2, template_version_uuid: "v2" } });
});
it("requires session before forwarding recovery", async () => {
  mocks.auth.mockResolvedValue({ error: Response.json({}, { status: 401 }) });
  expect((await POST(request(), { params: Promise.resolve({ uuid: "exam" }) })).status).toBe(401);
  expect(mocks.oh).not.toHaveBeenCalled();
});
it("returns the recovery error without success or an automatic retry", async () => {
  mocks.oh.mockRejectedValue(new Error("Clinical responses are already recorded"));
  expect((await POST(request(), { params: Promise.resolve({ uuid: "exam" }) })).status).toBe(409);
  expect(mocks.oh).toHaveBeenCalledTimes(1);
});
