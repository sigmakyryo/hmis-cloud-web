import { describe, expect, it } from "vitest";

import {
  extractAssistantMessage,
  extractOperations,
  parseSseChunk,
} from "@/features/oh-template-builder/lib/parseAiStream";

describe("parseAiStream", () => {
  it("reads text deltas from an SSE buffer", () => {
    const { events, rest } = parseSseChunk(
      'data: {"type":"text_delta","delta":"{\\"assistant"}\n\ndata: [DONE]\n\n',
    );
    expect(events).toHaveLength(2);
    expect(events[1]?.type).toBe("done");
    expect(events[0]?.type).toBe("text_delta");
    expect(rest).toBe("");
  });

  it("extracts the assistant message and complete operations while JSON is still streaming", () => {
    const partial =
      '{"assistant_message":"Adding vision.","operations":[{"type":"create_section","name":"Vision","code":"VISION"},{"type":"create_item","name":"Acuity"';

    expect(extractAssistantMessage(partial)).toBe("Adding vision.");
    expect(extractOperations(partial)).toEqual([
      { type: "create_section", name: "Vision", code: "VISION" },
    ]);
  });
});
