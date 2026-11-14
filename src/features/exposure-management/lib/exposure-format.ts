import type { Evaluation, EventStatus, Severity, ConfidenceLevel } from "@/features/exposure-management/exposure.types";

export const BAND_LABELS: Record<number, string> = {
  0: "Well below limit",
  1: "Low",
  2: "Moderate",
  3: "High",
  4: "Over limit",
};

/** Tailwind classes per AIHA-style band; the colour is never the only signal (a label always sits beside it). */
export const BAND_TONE: Record<number, string> = {
  0: "bg-emerald-50 text-emerald-800",
  1: "bg-lime-50 text-lime-800",
  2: "bg-amber-50 text-amber-800",
  3: "bg-orange-100 text-orange-900",
  4: "bg-red-100 text-red-800",
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  action_level: "Action level",
  exceeds_limit: "Exceeds limit",
  critical: "Critical",
};

export const SEVERITY_TONE: Record<Severity, string> = {
  action_level: "bg-amber-50 text-amber-800",
  exceeds_limit: "bg-orange-100 text-orange-900",
  critical: "bg-red-100 text-red-800",
};

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  open: "Open",
  investigating: "Investigating",
  controls_pending: "Controls pending",
  closed: "Closed",
};

export const EVALUATION_LABELS: Record<string, string> = {
  ok: "Within limit",
  action_level: "Action level",
  exceeds_limit: "Exceeds limit",
  critical: "Critical",
  unknown: "No limit to compare",
};

export const EVALUATION_TONE: Record<string, string> = {
  ok: "bg-emerald-50 text-emerald-800",
  action_level: "bg-amber-50 text-amber-800",
  exceeds_limit: "bg-orange-100 text-orange-900",
  critical: "bg-red-100 text-red-800",
  unknown: "bg-dash-canvas text-brand-slate",
};

export const HIERARCHY_LABELS: Record<string, string> = {
  elimination: "Elimination",
  substitution: "Substitution",
  engineering: "Engineering control",
  administrative: "Administrative control",
  ppe: "PPE",
};

export const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  none: "No data",
  low: "Low confidence (few samples)",
  medium: "Medium confidence",
  high: "High confidence",
};

export function evaluationLabel(value: Evaluation | string | null | undefined): string {
  return value ? (EVALUATION_LABELS[value] ?? value) : "Not evaluated";
}

/** Ratio of a result to its limit as a percentage, e.g. 0.82 becomes "82%". */
export function formatRatio(ratio: number | null | undefined): string {
  if (ratio === null || ratio === undefined || Number.isNaN(ratio)) return "—";
  const pct = ratio * 100;
  return `${pct >= 100 ? Math.round(pct) : pct.toFixed(pct >= 10 ? 0 : 1)}%`;
}

export function formatNumber(value: number | null | undefined, digits = 3): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  if (value === 0) return "0";
  const abs = Math.abs(value);
  if (abs >= 1000) return Math.round(value).toLocaleString();
  return Number(value.toPrecision(digits)).toString();
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
