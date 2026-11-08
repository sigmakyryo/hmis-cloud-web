import type { CofTemplateAiOperation } from "@/features/oh-template-builder/lib/templateAi";

export type AiStreamEvent = {
  type?: string;
  delta?: string;
  tool_name?: string;
  conversation_id?: string | null;
};

export function parseSseChunk(buffer: string): { events: AiStreamEvent[]; rest: string } {
  const events: AiStreamEvent[] = [];
  const parts = buffer.split("\n\n");
  const rest = parts.pop() ?? "";

  for (const part of parts) {
    const line = part
      .split("\n")
      .filter((row) => row.startsWith("data:"))
      .map((row) => row.slice(5).trim())
      .join("");
    if (!line || line === "[DONE]") {
      continue;
    }
    try {
      events.push(JSON.parse(line) as AiStreamEvent);
    } catch {
      // Incomplete JSON frames are ignored until the next chunk completes them.
    }
  }

  return { events, rest };
}

export function extractAssistantMessage(raw: string): string {
  const match = raw.match(/"assistant_message"\s*:\s*"((?:\\.|[^"\\])*)"/);
  if (!match?.[1]) {
    return "";
  }
  try {
    return JSON.parse(`"${match[1]}"`) as string;
  } catch {
    return match[1];
  }
}

export function extractOperations(raw: string): CofTemplateAiOperation[] {
  const marker = raw.indexOf('"operations"');
  if (marker === -1) {
    return [];
  }
  const arrayStart = raw.indexOf("[", marker);
  if (arrayStart === -1) {
    return [];
  }

  const operations: CofTemplateAiOperation[] = [];
  let depth = 0;
  let objectStart = -1;

  for (let index = arrayStart + 1; index < raw.length; index += 1) {
    const char = raw[index];
    if (char === "{") {
      if (depth === 0) {
        objectStart = index;
      }
      depth += 1;
    } else if (char === "}" && depth > 0) {
      depth -= 1;
      if (depth === 0 && objectStart !== -1) {
        const slice = raw.slice(objectStart, index + 1);
        objectStart = -1;
        try {
          const parsed = JSON.parse(slice) as CofTemplateAiOperation;
          if (typeof parsed.type === "string" && parsed.type !== "") {
            operations.push(parsed);
          }
        } catch {
          // Wait for a complete object.
        }
      }
    } else if (char === "]" && depth === 0) {
      break;
    }
  }

  return operations;
}

export function toolActivityLabel(toolName: string | undefined): string {
  const name = (toolName ?? "").toLowerCase();
  if (name.includes("describe")) {
    return "Reading this certificate";
  }
  if (name.includes("item")) {
    return "Opening section items";
  }
  if (name.includes("section") || name.includes("library")) {
    return "Searching the library";
  }
  return "Working";
}
