import { beforeEach, describe, expect, it, vi } from "vitest";

const ohServiceRequest = vi.hoisted(() => vi.fn());
const requireAccessToken = vi.hoisted(() => vi.fn());

vi.mock("@/lib/server/oh-service", () => ({ ohServiceRequest }));
vi.mock("@/lib/server/require-access-token", () => ({ requireAccessToken }));

describe("capture recovery BFF routes", () => {
  beforeEach(() => {
    vi.resetModules();
    ohServiceRequest.mockReset();
    requireAccessToken.mockReset();
    requireAccessToken.mockResolvedValue({ accessToken: "session-token" });
  });

  it("forwards COF template-version recovery without a trailing slash", async () => {
    ohServiceRequest.mockResolvedValue({ uuid: "cof-1", template_version_uuid: "ver-2" });
    const { POST } = await import("@/app/api/occupational-health/cof-responses/[uuid]/template-version/route");
    const response = await POST(
      new Request("http://localhost/api/occupational-health/cof-responses/cof-1/template-version", {
        method: "POST",
        body: JSON.stringify({ row_version: 1, template_version_uuid: "ver-2" }),
      }),
      { params: Promise.resolve({ uuid: "cof-1" }) },
    );
    expect(response.status).toBe(200);
    expect(ohServiceRequest).toHaveBeenCalledWith(
      "/oh-cof-responses/cof-1/template-version",
      expect.objectContaining({ method: "POST", token: "session-token" }),
    );
  });

  it("forwards employee-form template-version recovery without a trailing slash", async () => {
    ohServiceRequest.mockResolvedValue({ uuid: "emp-1", template_version_uuid: "ver-2" });
    const { POST } = await import("@/app/api/occupational-health/employee-form-responses/[uuid]/template-version/route");
    const response = await POST(
      new Request("http://localhost/api/occupational-health/employee-form-responses/emp-1/template-version", {
        method: "POST",
        body: JSON.stringify({ row_version: 1, template_version_uuid: "ver-2" }),
      }),
      { params: Promise.resolve({ uuid: "emp-1" }) },
    );
    expect(response.status).toBe(200);
    expect(ohServiceRequest).toHaveBeenCalledWith(
      "/oh-employee-form-responses/emp-1/template-version",
      expect.objectContaining({ method: "POST", token: "session-token" }),
    );
  });
});
