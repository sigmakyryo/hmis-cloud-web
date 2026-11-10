"use client";

import { useState } from "react";

import { citedPoints } from "@/features/occupational-health/components/OhCopilotResult";
import { useVisitBrief } from "@/features/occupational-health/hooks/use-visit-brief";
import { isOhEncounterPanelId, type OhEncounterPanelId } from "@/features/occupational-health/lib/oh-encounter-modules";
import { askVisitCopilot, type CopilotResponse } from "@/features/occupational-health/services/visit-copilot.service";

/** The visit's own check. It runs when the visit opens. A follow-up question sits underneath. */
export function OhVisitCopilot({
  visitUuid,
  onOpenPanel,
}: {
  visitUuid: string;
  onOpenPanel?: (panel: OhEncounterPanelId) => void;
}) {
  const brief = useVisitBrief(visitUuid);
  const [followUp, setFollowUp] = useState("");
  const [followPending, setFollowPending] = useState(false);
  const [followError, setFollowError] = useState("");
  const [followResult, setFollowResult] = useState<CopilotResponse | null>(null);
  const result = brief.data;
  const points = result ? citedPoints(result.points) : [];
  const wording = result?.draft.wording?.trim() ?? "";
  const restrictions = result?.draft.restrictions ?? [];

  async function askFollowUp() {
    const prompt = followUp.trim();
    if (!prompt) return;
    setFollowPending(true);
    setFollowError("");
    try {
      setFollowResult(await askVisitCopilot(visitUuid, prompt));
      setFollowUp("");
    } catch (caught) {
      setFollowError(caught instanceof Error ? caught.message : "Could not answer that.");
    } finally {
      setFollowPending(false);
    }
  }

  return (
    <section
      aria-label="Visit check"
      className="shrink-0 border-b border-dash-border bg-white px-5 py-3"
      data-testid="oh-visit-brief"
    >
      {brief.isLoading ? <p className="text-[13px] text-dash-muted">Checking this visit…</p> : null}
      {brief.isError ? (
        <p className="text-[13px] text-red-700">
          {brief.error instanceof Error ? brief.error.message : "Could not check this visit."}
        </p>
      ) : null}
      {result ? (
        <div className="space-y-2">
          <p className="text-[13px] font-medium text-brand-navy">{result.message || "Visit check"}</p>
          {points.length > 0 ? (
            <ul className="divide-y divide-dash-border/70 border-y border-dash-border/70">
              {points.map((point) => {
                const panel = isOhEncounterPanelId(point.panel) ? point.panel : null;
                return (
                  <li key={`${point.fact_id}-${point.text}`} className="flex items-start justify-between gap-3 py-1.5">
                    <p className="text-[13px] text-brand-navy">{point.text}</p>
                    {panel && onOpenPanel ? (
                      <button
                        type="button"
                        className="shrink-0 text-[12px] font-medium text-brand-primary hover:underline"
                        onClick={() => onOpenPanel(panel)}
                      >
                        {point.label}
                      </button>
                    ) : (
                      <span className="shrink-0 text-[12px] text-dash-muted">{point.label}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : null}
          {wording ? (
            <p className="text-[13px] text-brand-navy">
              <span className="text-dash-muted">Write-up. </span>
              {wording}
            </p>
          ) : null}
          {restrictions.length > 0 ? (
            <p className="text-[13px] text-brand-navy">
              <span className="text-dash-muted">Restrictions. </span>
              {restrictions.join("; ")}
            </p>
          ) : null}
        </div>
      ) : null}
      <form
        className="mt-2 flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void askFollowUp();
        }}
      >
        <label className="sr-only" htmlFor="oh-visit-follow-up">
          Ask something else
        </label>
        <input
          id="oh-visit-follow-up"
          value={followUp}
          onChange={(event) => setFollowUp(event.target.value)}
          placeholder="Ask something else"
          className="h-8 min-w-0 flex-1 rounded-md border border-dash-border bg-white px-2.5 text-[13px] text-brand-navy outline-none placeholder:text-dash-muted focus-visible:ring-2 focus-visible:ring-brand-primary/30"
        />
        <button
          type="submit"
          disabled={followPending || followUp.trim() === ""}
          className="text-[13px] font-medium text-brand-primary hover:underline disabled:opacity-50"
        >
          {followPending ? "Asking…" : "Ask"}
        </button>
      </form>
      {followError ? <p className="mt-1 text-[13px] text-red-700">{followError}</p> : null}
      {followResult ? (
        <p className="mt-2 text-[13px] text-brand-navy">{followResult.message}</p>
      ) : null}
    </section>
  );
}
