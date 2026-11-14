"use client";

import { cn } from "@/lib/utils";
import type { ConfidenceLevel, Evaluation, EventStatus, Severity } from "@/features/exposure-management/exposure.types";
import {
  BAND_LABELS,
  BAND_TONE,
  CONFIDENCE_LABELS,
  EVALUATION_TONE,
  EVENT_STATUS_LABELS,
  SEVERITY_LABELS,
  SEVERITY_TONE,
  evaluationLabel,
} from "@/features/exposure-management/lib/exposure-format";

const PILL = "inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-medium";

export function BandChip({ band, confidence }: { band: number | null | undefined; confidence?: ConfidenceLevel }) {
  if (band === null || band === undefined) {
    return <span className={cn(PILL, "bg-dash-canvas text-brand-slate")}>No data</span>;
  }
  return (
    <span className={cn(PILL, BAND_TONE[band] ?? "bg-dash-canvas text-brand-slate")} title={confidence ? CONFIDENCE_LABELS[confidence] : undefined}>
      Band {band} · {BAND_LABELS[band] ?? ""}
      {confidence === "low" ? " *" : ""}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <span className={cn(PILL, SEVERITY_TONE[severity])}>{SEVERITY_LABELS[severity]}</span>;
}

export function EventStatusBadge({ status }: { status: EventStatus }) {
  return (
    <span className={cn(PILL, status === "closed" ? "bg-emerald-50 text-emerald-700" : status === "open" ? "bg-sky-50 text-sky-700" : "bg-amber-50 text-amber-800")}>
      {EVENT_STATUS_LABELS[status]}
    </span>
  );
}

export function EvaluationBadge({ evaluation, belowLod }: { evaluation: Evaluation | string | null | undefined; belowLod?: boolean }) {
  return (
    <span className={cn(PILL, EVALUATION_TONE[evaluation ?? ""] ?? "bg-dash-canvas text-brand-slate")}>
      {evaluationLabel(evaluation)}
      {belowLod ? " · below LOD" : ""}
    </span>
  );
}

/** Standing reminder that shipped reference limits are defaults, not legal advice. */
export function LimitsDisclaimer({ text }: { text?: string }) {
  return (
    <p data-list-band role="note" className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-[13px] text-amber-900 md:px-6">
      {text ?? "Reference limits are cited defaults. Verify each against the current national standard before relying on it."}
    </p>
  );
}
