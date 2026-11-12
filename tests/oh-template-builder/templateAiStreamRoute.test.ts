import { POST as examPost } from "@/app/api/occupational-health/exam-templates/[uuid]/ai/stream/route";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as cofPost } from "@/app/api/occupational-health/cof-templates/[uuid]/ai/stream/route";

const auth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/server/require-access-token", () => ({ requireAccessToken: auth }));
vi.mock("@/lib/server/oh-service", () => ({ OH_SERVICE_URL: "https://oh.test/api" }));

const fetchMock = vi.fn();
const context = { params: Promise.resolve({ uuid: "template-uuid" }) };
const request = () => new Request("https://app.test/api/ai/stream", { method: "POST", body: JSON.stringify({ prompt: "Add vision" }) });
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
  auth.mockResolvedValue({ accessToken: "test-session" });
});
afterEach(() => vi.unstubAllGlobals());

describe.each([["cof", cofPost], ["exam", examPost]] as const)("%s AI BFF stream proxy", (kind, POST) => {
  it("forwards the template UUID, prompt, session and cancellation signal without buffering SSE", async () => {
    const body = 'data: {"type":"text_delta","delta":"Ready"}\n\ndata: [DONE]\n\n';
    fetchMock.mockResolvedValue(new Response(body, { headers: { "content-type": "text/event-stream" } }));
    const incoming = request();
    const response = await POST(incoming, context);
    expect(fetchMock).toHaveBeenCalledWith(`https://oh.test/api/oh-${kind}-templates/template-uuid/ai/stream/`, expect.objectContaining({
      method: "POST", body: JSON.stringify({ prompt: "Add vision" }), signal: incoming.signal,
      headers: expect.objectContaining({ "X-HMIS-Session": "test-session" }),
    }));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    await expect(response.text()).resolves.toBe(body);
  });
  it.each([401, 403, 422, 500, 503])("preserves HTTP %s but does not expose provider/debug payloads", async (status) => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ message: "private diagnostics", trace: "private stack" }), { status }));
    const response = await POST(request(), context);
    expect(response.status).toBe(status);
    const text = await response.text();
    expect(text).not.toContain("private");
    expect(text).toContain("assistant");
  });
  it("rejects HTML masquerading as a successful stream", async () => {
    fetchMock.mockResolvedValue(new Response("<html>private diagnostics</html>"));
    const response = await POST(request(), context);
    expect(response.status).toBe(502);
    expect(await response.text()).toContain("invalid stream response");
  });
  it("returns a meaningful gateway error for failed upstream connections", async () => {
    fetchMock.mockRejectedValue(new Error("private socket diagnostics"));
    const response = await POST(request(), context);
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("private");
  });
  it("does not contact Laravel when authentication fails", async () => {
    auth.mockResolvedValue({ error: new Response(null, { status: 401 }) });
    expect((await POST(request(), context)).status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
