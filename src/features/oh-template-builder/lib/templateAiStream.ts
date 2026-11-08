import type { CofTemplateAiOperation } from "@/features/oh-template-builder/lib/templateAi";
import { parseSseChunk, type AiStreamEvent } from "@/features/oh-template-builder/lib/parseAiStream";

/** Public status messages only: never forward provider/debug HTML, credentials or stack traces. */
export function assistantStreamHttpError(status: number): string {
  switch (status) {
    case 401: return "Your session expired. Sign in again to use the certificate assistant.";
    case 403: return "Administrator access is required to use the certificate assistant.";
    case 404: return "This certificate template could not be found. Reopen it and try again.";
    case 409: return "This approval is stale or already used. Request a fresh proposal.";
    case 410: return "This approval expired. Request a fresh proposal.";
    case 422: return "The assistant request was invalid. Check your prompt and try again.";
    case 429: return "The certificate assistant is busy. Please wait before trying again.";
    case 502: return "The certificate assistant service could not be reached. Please try again.";
    case 503: return "The certificate assistant is unavailable. Ask an administrator to check the AI provider configuration.";
    case 504: return "The certificate assistant timed out. Please try again.";
    default: return `The certificate assistant could not start (HTTP ${status}). Please try again.`;
  }
}

/** Consume only server-owned public error codes, not arbitrary provider diagnostics. */
export function assistantStreamFailureMessage(code?: string): string {
  switch (code) {
    case "assistant_approval_incomplete": return "The approved deletion response could not finish. Review the template before retrying.";
    case "assistant_timeout": return "The AI provider timed out before completing the draft. No changes were applied. Try a smaller request.";
    case "assistant_rate_limited": return "The AI provider rate limit was reached. Wait before trying again; no draft changes were applied.";
    case "assistant_insufficient_credits": return "The AI provider has insufficient credits. Ask an administrator to check provider billing.";
    case "assistant_provider_overloaded": return "The AI provider is temporarily overloaded. Try again later; no draft changes were applied.";
    default: return "The certificate assistant stopped before finishing. No draft changes were applied. Please try again.";
  }
}

/** Require a real SSE response and its terminal marker; EOF/errors must never look successful. */
export async function* readCertificateAiStream(response: Response): AsyncGenerator<AiStreamEvent> {
  if (!response.ok) throw new Error(assistantStreamHttpError(response.status));
  if (!response.body) throw new Error("The certificate assistant returned an empty stream. Please try again.");
  if (!response.headers.get("content-type")?.toLowerCase().includes("text/event-stream")) {
    throw new Error("The certificate assistant returned an invalid stream response. Please try again.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let receivedText = false;
  let receivedControl = false;
  let ended = false;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) {
        ended = true;
        throw new Error("The assistant stream closed before completion. The draft was not applied. Check server timeout logs if this repeats.");
      }
      buffer += decoder.decode(chunk.value, { stream: true });
      const parsed = parseSseChunk(buffer);
      buffer = parsed.rest;
      for (const event of parsed.events) {
        if (event.type === "error") {
          throw new Error(assistantStreamFailureMessage(event.code));
        }
        if (event.type === "done") {
          if (!receivedText && !receivedControl) throw new Error("The certificate assistant returned no draft. Please try again.");
          return;
        }
        if (["refusal", "approval_required", "approval_result"].includes(event.type ?? "")) receivedControl = true;
        if (event.type === "text_delta" && event.delta) receivedText = true;
        yield event;
      }
    }
  } finally {
    // Also cancel on early consumer exit (for example, a template/session change).
    if (!ended) await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

/** Streaming is textual in this SDK, so verify the final object before reporting completion. */
export function validateCertificateAiDraft(raw: string): { assistant_message: string; operations: CofTemplateAiOperation[]; refused?: boolean } {
  try {
    const draft: unknown = JSON.parse(raw);
    if (typeof draft !== "object" || draft === null ||
      !("assistant_message" in draft) || typeof draft.assistant_message !== "string" ||
      !("operations" in draft) || !Array.isArray(draft.operations)) {
      throw new Error("Invalid draft shape");
    }
    if ("refused" in draft && draft.refused === true) return { assistant_message: "Can't help with that.", operations: [], refused: true };
    return draft as { assistant_message: string; operations: CofTemplateAiOperation[]; refused?: boolean };
  } catch {
    throw new Error("The certificate assistant returned an invalid draft. Review any partial changes and try again.");
  }
}

/** Shared transport framing; domain-specific wording must not imply an exam edits COF resources. */
export async function* readTemplateAiStream(response: Response, kind: "exam" | "certificate") {
  try {
    yield* readCertificateAiStream(response);
  } catch (error) {
    if (kind === "exam" && error instanceof Error) throw new Error(error.message.replaceAll("certificate", "exam"));
    throw error;
  }
}
