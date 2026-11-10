import type { HpProgram, HpResult } from "@/features/occupational-health/services/health-programs.service";

export const PROGRAM_LABEL: Record<HpProgram, string> = {
  hearing: "Hearing",
  lung: "Lung function",
  vision: "Vision",
  ergonomics: "Ergonomics",
  fatigue: "Fatigue",
};

export const OUTCOME_LABEL: Record<string, string> = { fit: "Fit", restricted: "Fit with restrictions", unfit: "Not fit" };
export const OUTCOME_TONE: Record<string, string> = { fit: "cleared", restricted: "expiring", unfit: "not_cleared" };
export const DUE_LABEL: Record<string, string> = { overdue: "Overdue", due: "Due", never: "Never done" };
export const DUE_TONE: Record<string, string> = { overdue: "overdue", due: "due", never: "pending" };

export const FLAG_LABEL: Record<string, string> = {
  sts: "Hearing shift",
  recordable: "Recordable shift",
  hearing_loss: "Hearing loss",
  obstruction: "Airflow obstruction",
  possible_restriction: "Possible restriction",
  low_fev1: "Low FEV1",
  excess_decline: "Fast decline",
  acuity_below_standard: "Acuity below standard",
  field_below_standard: "Field below standard",
  colour_deficiency: "Colour deficiency",
  high_ergonomic_risk: "High task risk",
  severe_sleepiness: "Severe sleepiness",
  excessive_sleepiness: "Excessive sleepiness",
  long_week: "Long week",
  long_shift: "Long shift",
  insufficient_prior_sleep: "Too little sleep",
};

export function flagText(flags: string[] | undefined): string {
  return (flags ?? []).map((f) => FLAG_LABEL[f] ?? f.replace(/_/g, " ")).join(", ");
}

const num = (v: unknown): number | null => (typeof v === "number" ? v : typeof v === "string" && v !== "" && !Number.isNaN(Number(v)) ? Number(v) : null);

/** One-line headline per programme for tables. */
export function headline(r: HpResult): string {
  const c = r.computed ?? {};
  switch (r.program) {
    case "hearing": {
      const avg = c.average_234 as { left?: number; right?: number } | undefined;
      const shift = c.shift_db as { left?: number | null; right?: number | null } | undefined;
      const base = avg ? `2-4 kHz avg L ${avg.left ?? "—"} / R ${avg.right ?? "—"} dB` : "";
      return shift && (shift.left != null || shift.right != null) ? `${base} · shift L ${shift.left ?? "—"} / R ${shift.right ?? "—"}` : `${base}${r.is_baseline ? " · baseline" : ""}`;
    }
    case "lung":
      return `FEV1/FVC ${num(c.fev1_fvc) ?? "—"} · FEV1 ${num(c.fev1_pct_pred) ?? "—"}% predicted${num(c.fev1_decline_pct) != null ? ` · decline ${num(c.fev1_decline_pct)}%` : ""}`;
    case "vision":
      return `Acuity ${num(c.binocular_decimal) ?? "—"}${num(c.field_deg) != null ? ` · field ${num(c.field_deg)}°` : ""}`;
    case "ergonomics":
      return `${String(c.method ?? "").toUpperCase()} ${num(c.score) ?? "—"} · ${String(c.action ?? "")}`;
    case "fatigue":
      return `Epworth ${num(c.epworth) ?? "—"} · risk ${String(c.risk_level ?? "—")}`;
    default:
      return "";
  }
}

/** Value plotted on the trend chart. */
export function trendValue(r: HpResult): { value: number | null; second?: number | null; unit: string; label: string; secondLabel?: string } {
  const c = r.computed ?? {};
  switch (r.program) {
    case "hearing": {
      const avg = (c.average_234 ?? {}) as { left?: number; right?: number };
      return { value: avg.left ?? null, second: avg.right ?? null, unit: "dB", label: "Left 2-4 kHz", secondLabel: "Right 2-4 kHz" };
    }
    case "lung":
      return { value: num(r.data.fev1), second: num(c.fev1_pct_pred), unit: "", label: "FEV1 (L)", secondLabel: "% predicted" };
    case "vision":
      return { value: num(c.binocular_decimal), unit: "", label: "Binocular acuity" };
    case "ergonomics":
      return { value: num(c.score), unit: "", label: "Score" };
    case "fatigue":
      return { value: num(c.epworth), second: num(c.risk_score), unit: "", label: "Epworth", secondLabel: "Risk score" };
    default:
      return { value: null, unit: "", label: "" };
  }
}
