"use client";

import type { CopilotPoint, CopilotResponse } from "@/features/occupational-health/services/visit-copilot.service";
import { isOhEncounterPanelId, type OhEncounterPanelId } from "@/features/occupational-health/lib/oh-encounter-modules";

const KNOWN_SOURCES = new Set(["fitness", "vaccine", "hearing", "lung", "hazard", "exam", "exposure", "declination"]);

export function citedPoints(points: CopilotPoint[]): CopilotPoint[] {
  return points.filter((point) => KNOWN_SOURCES.has(point.source) && point.text.trim() !== "");
}

/** Answer and draft text. Dates shown here are the service dates, not dates parsed from the prose. */
export function OhCopilotResult({
  result,
  onOpenPanel,
}: {
  result: CopilotResponse;
  onOpenPanel?: (panel: OhEncounterPanelId) => void;
}) {
  const points = citedPoints(result.points);
  const draft = result.draft;
  const due = draft.next_due_date;

  return (
    <div className="space-y-3 text-[13px]" data-testid="oh-copilot-result">
      {result.refused ? <p className="text-dash-muted">{result.message || "Can't help with that."}</p> : null}
      {!result.refused && result.message ? <p className="text-brand-navy">{result.message}</p> : null}
      {due ? (
        <p className="text-brand-navy">
          Next due <span className="font-medium tabular-nums">{due}</span>
          {draft.vaccine_code ? ` · ${draft.vaccine_code}` : ""}
          {draft.doses_received != null && draft.doses_required != null
            ? ` · ${draft.doses_received} of ${draft.doses_required} doses`
            : ""}
          {draft.status ? ` · ${draft.status}` : ""}
        </p>
      ) : null}
      {points.length > 0 ? (
        <ul className="space-y-2">
          {points.map((point) => {
            const panel = isOhEncounterPanelId(point.panel) ? point.panel : null;
            return (
              <li key={`${point.fact_id}-${point.text}`} className="rounded-md border border-dash-border px-3 py-2">
                <p className="text-brand-navy">{point.text}</p>
                {panel && onOpenPanel ? (
                  <button
                    type="button"
                    className="mt-1 text-[12px] font-medium text-brand-primary hover:underline"
                    onClick={() => onOpenPanel(panel)}
                  >
                    {point.label}
                  </button>
                ) : (
                  <p className="mt-1 text-[12px] text-dash-muted">{point.label}</p>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
      {draft.wording ? <DraftBlock label="Certificate wording" text={draft.wording} /> : null}
      {draft.restrictions && draft.restrictions.length > 0 ? (
        <DraftBlock label="Restrictions" text={draft.restrictions.join("\n")} />
      ) : null}
      {draft.clinician_explanation ? <DraftBlock label="For the clinician" text={draft.clinician_explanation} /> : null}
      {draft.worker_explanation ? <DraftBlock label="For the worker" text={draft.worker_explanation} /> : null}
      {draft.letter ? <DraftBlock label="Letter" text={draft.letter} /> : null}
      {draft.whatsapp ? <DraftBlock label="WhatsApp" text={draft.whatsapp} /> : null}
      {draft.board_brief ? <DraftBlock label="Board brief" text={draft.board_brief} /> : null}
      {draft.clinical_note ? <DraftBlock label="Clinical note" text={draft.clinical_note} /> : null}
      {draft.five_whys && draft.five_whys.length > 0 ? (
        <ol className="list-decimal space-y-1 pl-5 text-brand-navy">
          {draft.five_whys.map((why) => (
            <li key={why}>{why}</li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

function DraftBlock({ label, text }: { label: string; text: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[12px] font-medium text-dash-muted">{label}</p>
      <p className="whitespace-pre-wrap text-brand-navy">{text}</p>
    </div>
  );
}
