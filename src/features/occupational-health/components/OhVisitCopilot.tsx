"use client";

import { useState } from "react";

import { SecondaryButton } from "@/components/ui/app-buttons";
import { Textarea } from "@/components/ui/textarea";
import { OhCopilotResult } from "@/features/occupational-health/components/OhCopilotResult";
import type { OhEncounterPanelId } from "@/features/occupational-health/lib/oh-encounter-modules";
import {
  askVisitCopilot,
  draftVisitCertificate,
  type CopilotDraft,
  type CopilotResponse,
} from "@/features/occupational-health/services/visit-copilot.service";

/** Question box for one visit. Draft wording is handed to the certificate form; nothing is saved here. */
export function OhVisitCopilot({
  visitUuid,
  onOpenPanel,
  onCertificateDraft,
}: {
  visitUuid: string;
  onOpenPanel?: (panel: OhEncounterPanelId) => void;
  onCertificateDraft?: (draft: CopilotDraft) => void;
}) {
  const [prompt, setPrompt] = useState("What is still open before I sign this certificate?");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CopilotResponse | null>(null);

  async function run(work: () => Promise<CopilotResponse>) {
    setPending(true);
    setError("");
    try {
      setResult(await work());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The copilot could not answer.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-dash-border bg-dash-canvas/40 p-3" data-testid="oh-visit-copilot">
      <label className="block space-y-1.5">
        <span className="text-[12px] font-medium text-dash-muted">Ask about this visit</span>
        <Textarea rows={2} value={prompt} onChange={(event) => setPrompt(event.target.value)} />
      </label>
      <div className="flex flex-wrap gap-2">
        <SecondaryButton
          type="button"
          className="h-8"
          disabled={pending || prompt.trim() === ""}
          onClick={() => void run(() => askVisitCopilot(visitUuid, prompt.trim()))}
        >
          {pending ? "Asking…" : "Ask"}
        </SecondaryButton>
        {onCertificateDraft ? (
          <SecondaryButton
            type="button"
            className="h-8"
            disabled={pending}
            onClick={() =>
              void run(async () => {
                const next = await draftVisitCertificate(visitUuid);
                onCertificateDraft(next.draft);
                return next;
              })
            }
          >
            Draft wording
          </SecondaryButton>
        ) : null}
      </div>
      {error ? <p className="text-[13px] text-red-700">{error}</p> : null}
      {result ? <OhCopilotResult result={result} onOpenPanel={onOpenPanel} /> : null}
    </div>
  );
}
