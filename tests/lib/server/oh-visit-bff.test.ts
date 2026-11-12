import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { nativeOhVisitPost } from "@/lib/server/oh-visit-bff";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), oh: vi.fn() }));
vi.mock("@/lib/server/require-access-token", () => ({ requireAccessToken: mocks.auth }));
vi.mock("@/lib/server/oh-service", () => ({ ohServiceRequest: mocks.oh }));
vi.mock("@/lib/server/bff-response", () => ({
  bffSuccess: (data: unknown) => Response.json(data),
  bffError: () => Response.json({ message: "Reference unavailable" }, { status: 503 }),
}));
let log: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  vi.clearAllMocks();
  log = vi.spyOn(console, "info").mockImplementation(() => undefined);
  mocks.auth.mockResolvedValue({ accessToken: "secret-test-token" });
  mocks.oh.mockResolvedValue({ uuid: "encounter", visit: "visit", origin: "laravel" });
});
afterEach(() => vi.restoreAllMocks());
function request() { return new Request("http://app.localhost/api/occupational-health/visits", { method: "POST", body: JSON.stringify({ customer_uuid: "private-customer" }) }); }
it("routes creation to Laravel only and emits redacted server outcome logging", async () => {
  expect((await nativeOhVisitPost(request())).status).toBe(200);
  expect(mocks.oh).toHaveBeenCalledWith("/oh/visits", expect.objectContaining({ method: "POST" }));
  expect(log).toHaveBeenCalledWith("OH visit BFF outcome", { status: 200, duration_ms: expect.any(Number), error_class: null });
  expect(JSON.stringify(log.mock.calls)).not.toContain("private-customer");
  expect(JSON.stringify(log.mock.calls)).not.toContain("secret-test-token");
});
it("logs authorization failure without a service call", async () => {
  mocks.auth.mockResolvedValue({ error: Response.json({}, { status: 401 }) });
  expect((await nativeOhVisitPost(request())).status).toBe(401);
  expect(mocks.oh).not.toHaveBeenCalled();
  expect(log).toHaveBeenCalledWith("OH visit BFF outcome", expect.objectContaining({ status: 401 }));
});
it("preserves upstream failure status with safe exception class logging", async () => {
  mocks.oh.mockRejectedValue(new Error("sensitive provider detail"));
  expect((await nativeOhVisitPost(request())).status).toBe(503);
  expect(log).toHaveBeenCalledWith("OH visit BFF outcome", expect.objectContaining({ status: 503, error_class: "Error" }));
  expect(JSON.stringify(log.mock.calls)).not.toContain("sensitive provider detail");
});
