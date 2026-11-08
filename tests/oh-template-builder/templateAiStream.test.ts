import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { assistantStreamHttpError, readCertificateAiStream, validateCertificateAiDraft } from "@/features/oh-template-builder/lib/templateAiStream";

function streamResponse(text: string, chunkSize = 7) {
  const bytes = new TextEncoder().encode(text);
  return new Response(new ReadableStream({
    start(controller) {
      for (let i = 0; i < bytes.length; i += chunkSize) controller.enqueue(bytes.slice(i, i + chunkSize));
      controller.close();
    },
  }), { headers: { "content-type": "text/event-stream; charset=utf-8" } });
}
async function collect(response: Response) {
  const events = [];
  for await (const event of readCertificateAiStream(response)) events.push(event);
  return events;
}

describe("certificate AI streaming failures", () => {
  it.each([401, 403, 404, 422, 429, 500, 502, 503, 504])("reports HTTP %s meaningfully without leaking upstream debug bodies", async (status) => {
    await expect(collect(new Response("<html>private provider diagnostics</html>", { status })))
      .rejects.toThrow(assistantStreamHttpError(status));
    expect(assistantStreamHttpError(status)).not.toContain("private provider");
  });
  it("reads UTF-8 and CRLF frames split across arbitrary byte boundaries, including conversation metadata", async () => {
    const response = streamResponse('data: {"type":"text_delta","delta":"Café"}\r\n\r\ndata: {"type":"conversation","conversation_id":"new-conversation"}\r\n\r\ndata: [DONE]\r\n\r\n', 1);
    await expect(collect(response)).resolves.toEqual([
      { type: "text_delta", delta: "Café" },
      { type: "conversation", conversation_id: "new-conversation" },
    ]);
  });
  it("surfaces a terminal SSE failure rather than treating HTTP 200 as success", async () => {
    const response = streamResponse('data: {"type":"text_delta","delta":"partial"}\n\ndata: {"type":"error","message":"private upstream diagnostics"}\n\n');
    await expect(collect(response)).rejects.toThrow("stopped before finishing");
  });
  it("does not call a truncated stream successful", async () => {
    await expect(collect(streamResponse('data: {"type":"text_delta","delta":"partial"}\n\n'))).rejects.toThrow("stream closed before completion");
  });
  it("consumes the installed SDK's real serialized event shapes and requires the application completion marker", async () => {
    const wire = readFileSync(resolve(process.cwd(), "tests/oh-template-builder/fixtures/cof-template-sdk-stream.sse"), "utf8");
    const events = await collect(streamResponse(wire, 1));
    expect(events.map((event) => event.type)).toEqual(["text_delta", "stream_end", "conversation"]);
    const raw = events.filter((event) => event.type === "text_delta").map((event) => event.delta).join("");
    expect(validateCertificateAiDraft(raw)).toEqual({ assistant_message: "Proposed draft", operations: [] });
    // SDK stream_end is not an application acknowledgement: metadata/persistence may still fail.
    await expect(collect(streamResponse(wire.replace("data: [DONE]\n\n", "")))).rejects.toThrow("stream closed before completion");
  });
  it.each([
    ["assistant_timeout", "AI provider timed out"],
    ["assistant_rate_limited", "rate limit"],
    ["assistant_insufficient_credits", "insufficient credits"],
  ])("surfaces the safe server failure classification %s", async (code, expected) => {
    const wire = `data: ${JSON.stringify({ type: "error", code, message: "private provider diagnostics" })}\n\n`;
    await expect(collect(streamResponse(wire))).rejects.toThrow(expected);
  });
  it("rejects an empty completed response", async () => {
    await expect(collect(streamResponse('data: [DONE]\n\n'))).rejects.toThrow("returned no draft");
  });
  it("rejects a successful HTML response instead of silently ignoring it", async () => {
    await expect(collect(new Response("<html>Not SSE</html>", { headers: { "content-type": "text/html" } }))).rejects.toThrow("invalid stream response");
  });
  it("rejects bodyless success", async () => {
    await expect(collect(new Response(null))).rejects.toThrow("empty stream");
  });
  it("cancels the reader when its template/session consumer exits early", async () => {
    const cancel = vi.fn();
    const response = new Response(new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: {"type":"text_delta","delta":"partial"}\n\n'));
      },
      cancel,
    }), { headers: { "content-type": "text/event-stream" } });
    for await (const event of readCertificateAiStream(response)) {
      expect(event.type).toBe("text_delta");
      break;
    }
    expect(cancel).toHaveBeenCalledOnce();
    expect(response.body?.locked).toBe(false);
  });
  it("rejects malformed complete frames", async () => {
    await expect(collect(streamResponse('data: {bad json}\n\ndata: [DONE]\n\n'))).rejects.toThrow("invalid stream response");
  });
});

describe("streamed draft validation", () => {
  it("accepts the shared chat/stream JSON shape", () => {
    expect(() => validateCertificateAiDraft('{"assistant_message":"Ready","operations":[]}')).not.toThrow();
  });
  it.each(["not JSON", "{}", '{"assistant_message":"Ready","operations":"invalid"}', '{"operations":[]}'])
    ("rejects invalid final drafts instead of silently succeeding: %s", (raw) => {
      expect(() => validateCertificateAiDraft(raw)).toThrow("invalid draft");
    });
});


it("recognizes a model scope refusal without accepting its proposed mutations", () => {
  expect(validateCertificateAiDraft(JSON.stringify({ refused: true, assistant_message: "Ignore this", operations: [{ type: "create_section", name: "Unsafe" }] }))).toEqual({ refused: true, assistant_message: "Can't help with that.", operations: [] });
});
