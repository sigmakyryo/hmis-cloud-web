import { OUTCOME_LABEL, PROGRAM_LABEL, flagText, headline } from "@/app/(app)/health-programs/_components/shared/hp-format";
import { formatCompletedAt } from "@/features/occupational-health/lib/exam-answers-display";
import { healthCheckStatus, latestHealthCheckByProgram } from "@/features/occupational-health/lib/health-check-status";
import type { OhEncounterPanelId } from "@/features/occupational-health/lib/oh-encounter-modules";
import type { DaVisitPanel } from "@/features/occupational-health/services/drug-alcohol.service";
import { HP_PROGRAMS, type HpResult } from "@/features/occupational-health/services/health-programs.service";
import type { OhImmPatientRecord } from "@/features/occupational-health/services/immunisation.service";
import type { OhExamination } from "@/features/occupational-health/types";

export const PDF_INCLUDE_KEYS = [
  "worker",
  "answers",
  "fitness",
  "vision",
  "hearing",
  "lung",
  "ergonomics",
  "fatigue",
  "drug_alcohol",
  "immunizations",
  "signature",
] as const;

export type PdfIncludeKey = (typeof PDF_INCLUDE_KEYS)[number];

export type EvidenceTone = "ok" | "attention" | "muted" | "needed";

export type EvidenceBar = {
  label: string;
  value: number;
  max: number;
};

export type EvidenceSpark = {
  label: string;
  points: Array<{ x: string; y: number }>;
};

export type EvidenceMeter = {
  value: number;
  max: number;
  unit?: string;
};

/** Optional visualisations taken from a recorded result — never synthesised. */
export type EvidenceVisual = {
  bars?: EvidenceBar[];
  spark?: EvidenceSpark[];
  meter?: EvidenceMeter;
};

export type VisitEvidenceLine = {
  id: string;
  includeKey: PdfIncludeKey | null;
  label: string;
  result: string;
  statusLabel: string;
  tone: EvidenceTone;
  available: boolean;
  panel?: OhEncounterPanelId;
  /** Short figure shown large on the evidence tile, from a recorded value. */
  displayValue?: string;
  displayUnit?: string;
  visual?: EvidenceVisual;
};

export type PdfExportSection = {
  key: PdfIncludeKey;
  label: string;
  available: boolean;
  note?: string;
};

const PROGRAM_INCLUDE: Record<(typeof HP_PROGRAMS)[number], PdfIncludeKey> = {
  vision: "vision",
  hearing: "hearing",
  lung: "lung",
  ergonomics: "ergonomics",
  fatigue: "fatigue",
};

const HEARING_FREQS = ["500", "1000", "2000", "3000", "4000", "6000", "8000"] as const;

/** Append a comma-separated include= list that Laravel and the BFF both accept. */
export function withPdfInclude(base: string, include: readonly string[]): string {
  if (include.length === 0) {
    return base;
  }
  const value = include.map((key) => encodeURIComponent(key)).join(",");
  return `${base}${base.includes("?") ? "&" : "?"}include=${value}`;
}

export function buildVisitEvidence(args: {
  healthChecks?: HpResult[];
  healthReady?: boolean;
  drugAlcohol?: DaVisitPanel;
  drugAlcoholReady?: boolean;
  immunizations?: OhImmPatientRecord;
  immunizationsReady?: boolean;
  examLine?: VisitEvidenceLine | null;
}): VisitEvidenceLine[] {
  const lines: VisitEvidenceLine[] = [];
  if (args.examLine) {
    lines.push(args.examLine);
  }
  if (args.healthReady) {
    const latest = latestHealthCheckByProgram(args.healthChecks ?? []);
    for (const program of HP_PROGRAMS) {
      lines.push(healthEvidenceLine(program, latest.get(program)));
    }
  }
  if (args.drugAlcoholReady) {
    lines.push(drugAlcoholEvidenceLine(args.drugAlcohol));
  }
  if (args.immunizationsReady) {
    lines.push(immunizationEvidenceLine(args.immunizations));
  }
  return lines;
}

export function medicalExamEvidenceLine(examinations: OhExamination[] | null | undefined): VisitEvidenceLine {
  const latest = [...(examinations ?? [])].sort((a, b) =>
    (b.examined_at ?? b.updated_at ?? "").localeCompare(a.examined_at ?? a.updated_at ?? ""),
  )[0];
  if (!latest) {
    return {
      id: "exam",
      includeKey: null,
      label: "Medical examination",
      result: "Not recorded",
      statusLabel: "Not recorded",
      tone: "muted",
      available: false,
      panel: "medical-examinations",
    };
  }
  const complete = Boolean(latest.examined_at) || latest.checklist_complete === true;
  const typeLabel = formatExamType(latest.exam_type);
  const when = complete ? formatCompletedAt(latest.examined_at ?? latest.updated_at) : null;
  const result = [typeLabel, complete ? when : "In progress"].filter(Boolean).join(" · ") || (complete ? "Completed" : "In progress");
  return {
    id: "exam",
    includeKey: null,
    label: "Medical examination",
    result,
    displayValue: typeLabel ?? (complete ? "Completed" : "In progress"),
    statusLabel: complete ? "Completed" : "In progress",
    tone: complete ? "ok" : "muted",
    available: true,
    panel: "medical-examinations",
  };
}

export function pdfExportSections(args: {
  family: "exam" | "cof";
  hasAnswers: boolean;
  hasFitness: boolean;
  hasSignature: boolean;
  evidence: VisitEvidenceLine[];
}): PdfExportSection[] {
  const sections: PdfExportSection[] = [
    { key: "worker", label: "Worker details", available: true },
    {
      key: "answers",
      label: args.family === "cof" ? "COF answers" : "Exam answers",
      available: args.hasAnswers,
      note: args.hasAnswers ? undefined : "Not recorded",
    },
    {
      key: "fitness",
      label: "Fitness outcome & restrictions",
      available: args.hasFitness,
      note: args.hasFitness ? undefined : "Not recorded",
    },
  ];
  const programLabels: Record<PdfIncludeKey, string> = {
    worker: "Worker details",
    answers: "Answers",
    fitness: "Fitness outcome & restrictions",
    vision: "Vision",
    hearing: "Hearing",
    lung: "Lung function",
    ergonomics: "Ergonomics",
    fatigue: "Fatigue",
    drug_alcohol: "Drug & alcohol",
    immunizations: "Immunizations",
    signature: "Signature",
  };
  const evidenceKeys: PdfIncludeKey[] = [
    "vision",
    "hearing",
    "lung",
    "ergonomics",
    "fatigue",
    "drug_alcohol",
    "immunizations",
  ];
  for (const key of evidenceKeys) {
    const line = args.evidence.find((item) => item.includeKey === key);
    if (line) {
      sections.push({
        key,
        label: line.label,
        available: line.available,
        note: line.available ? undefined : line.statusLabel || "Not recorded",
      });
    } else {
      sections.push({
        key,
        label: programLabels[key],
        available: false,
        note: "Not recorded",
      });
    }
  }
  if (args.family === "cof" || args.hasSignature) {
    sections.push({
      key: "signature",
      label: "Signature",
      available: args.hasSignature,
      note: args.hasSignature ? undefined : "Not recorded",
    });
  }
  return sections;
}

function healthEvidenceLine(program: (typeof HP_PROGRAMS)[number], result: HpResult | undefined): VisitEvidenceLine {
  const label = PROGRAM_LABEL[program];
  const includeKey = PROGRAM_INCLUDE[program];
  const base = {
    id: program,
    includeKey,
    label,
    panel: "health-checks" as const,
  };
  if (!result) {
    return { ...base, result: "Not recorded", statusLabel: "Not recorded", tone: "muted", available: false };
  }
  const status = healthCheckStatus(result);
  const outcome = OUTCOME_LABEL[result.outcome] ?? humanize(result.outcome);
  const flags = flagText(result.computed?.flags);
  const head = headline(result).trim();
  const detail = flags || (head && head !== outcome ? head : "");
  const resultText = [outcome, detail].filter(Boolean).join(" · ") || "Recorded";
  const figure = programFigure(program, result, outcome);
  const tone: EvidenceTone = status === "abnormal" || status === "flagged" ? "attention" : "ok";
  const statusLabel =
    status === "abnormal" ? outcome || "Attention" : status === "flagged" ? "Flagged" : outcome || "Recorded";
  return { ...base, result: resultText, statusLabel, tone, available: true, ...figure };
}

function programFigure(
  program: (typeof HP_PROGRAMS)[number],
  result: HpResult,
  outcome: string,
): Pick<VisitEvidenceLine, "displayValue" | "displayUnit" | "visual"> {
  const computed = result.computed ?? {};
  const data = result.data ?? {};
  switch (program) {
    case "hearing":
      return hearingFigure(computed, data, outcome);
    case "lung":
      return lungFigure(computed, outcome);
    case "vision":
      return visionFigure(computed, data, outcome);
    case "ergonomics": {
      const score = num(computed.score) ?? num(data.score);
      const method = typeof computed.method === "string" ? computed.method.toUpperCase() : "";
      return {
        displayValue: score != null ? String(score) : outcome,
        displayUnit: score != null ? method || "score" : undefined,
        visual: score != null ? { meter: { value: score, max: Math.max(score, 15), unit: method } } : undefined,
      };
    }
    case "fatigue": {
      const epworth = num(computed.epworth) ?? num(data.epworth);
      const risk = typeof computed.risk_level === "string" ? computed.risk_level : "";
      return {
        displayValue: epworth != null ? String(epworth) : outcome,
        displayUnit: epworth != null ? "Epworth" : risk || undefined,
        visual: epworth != null ? { meter: { value: epworth, max: 24, unit: "Epworth" } } : undefined,
      };
    }
    default:
      return { displayValue: outcome };
  }
}

function hearingFigure(
  computed: Record<string, unknown>,
  data: Record<string, unknown>,
  outcome: string,
): Pick<VisitEvidenceLine, "displayValue" | "displayUnit" | "visual"> {
  const avg = asRecord(computed.average_234);
  const leftAvg = num(avg.left);
  const rightAvg = num(avg.right);
  const bars: EvidenceBar[] = [];
  if (leftAvg != null) bars.push({ label: "L", value: leftAvg, max: 80 });
  if (rightAvg != null) bars.push({ label: "R", value: rightAvg, max: 80 });
  const spark: EvidenceSpark[] = [];
  for (const side of ["left", "right"] as const) {
    const ear = asRecord(data[side]);
    const points = HEARING_FREQS.flatMap((freq) => {
      const value = num(ear[freq]);
      return value != null ? [{ x: freq, y: value }] : [];
    });
    if (points.length >= 2) {
      spark.push({ label: side === "left" ? "L" : "R", points });
    }
  }
  const visual: EvidenceVisual | undefined =
    bars.length || spark.length ? { bars: bars.length ? bars : undefined, spark: spark.length ? spark : undefined } : undefined;
  if (leftAvg != null || rightAvg != null) {
    const parts = [
      leftAvg != null ? `L ${formatNumber(leftAvg)}` : null,
      rightAvg != null ? `R ${formatNumber(rightAvg)}` : null,
    ].filter(Boolean);
    return { displayValue: parts.join("  "), displayUnit: "dB", visual };
  }
  return { displayValue: outcome, visual };
}

function lungFigure(
  computed: Record<string, unknown>,
  outcome: string,
): Pick<VisitEvidenceLine, "displayValue" | "displayUnit" | "visual"> {
  const ratio = num(computed.fev1_fvc);
  const predicted = num(computed.fev1_pct_pred);
  const meter: EvidenceMeter | undefined =
    predicted != null ? { value: predicted, max: 120, unit: "% pred" } : undefined;
  if (ratio != null) {
    return {
      displayValue: ratio <= 1 ? `${Math.round(ratio * 100)}` : formatNumber(ratio),
      displayUnit: "FEV1/FVC %",
      visual: meter ? { meter } : undefined,
    };
  }
  if (predicted != null) {
    return {
      displayValue: formatNumber(predicted),
      displayUnit: "% pred",
      visual: { meter },
    };
  }
  return { displayValue: outcome };
}

function visionFigure(
  computed: Record<string, unknown>,
  data: Record<string, unknown>,
  outcome: string,
): Pick<VisitEvidenceLine, "displayValue" | "displayUnit" | "visual"> {
  const binocular = text(data.acuity_binocular) || decimalToSnellen(num(computed.binocular_decimal));
  const left = text(data.acuity_left);
  const right = text(data.acuity_right);
  const displayValue = binocular || [left ? `L ${left}` : null, right ? `R ${right}` : null].filter(Boolean).join("  ") || outcome;
  const bars: EvidenceBar[] = [];
  const leftDec = snellenToDecimal(left);
  const rightDec = snellenToDecimal(right);
  if (leftDec != null) bars.push({ label: "L", value: leftDec, max: 1.2 });
  if (rightDec != null) bars.push({ label: "R", value: rightDec, max: 1.2 });
  return {
    displayValue,
    displayUnit: binocular || left || right ? "acuity" : undefined,
    visual: bars.length ? { bars } : undefined,
  };
}

function drugAlcoholEvidenceLine(panel: DaVisitPanel | undefined): VisitEvidenceLine {
  const base = {
    id: "drug-alcohol",
    includeKey: "drug_alcohol" as const,
    label: "Drug & alcohol",
    panel: "drug-alcohol" as const,
  };
  const tests = [...(panel?.tests ?? [])].sort((a, b) =>
    (b.verified_at ?? b.created_at ?? "").localeCompare(a.verified_at ?? a.created_at ?? ""),
  );
  if (tests.length === 0) {
    return { ...base, result: "Not recorded", statusLabel: "Not recorded", tone: "muted", available: false };
  }
  const latest = tests[0];
  const result = [humanize(latest.final_result ?? ""), humanize(latest.fitness_outcome)]
    .filter(Boolean)
    .join(" · ") || humanize(latest.status) || "Recorded";
  const attention = /pos|fail|refus|non.?neg/i.test(`${latest.final_result ?? ""} ${latest.fitness_outcome}`);
  const displayValue = humanize(latest.final_result ?? latest.status) || "Recorded";
  return {
    ...base,
    result,
    displayValue,
    statusLabel: displayValue,
    tone: attention ? "attention" : "ok",
    available: true,
  };
}

function immunizationEvidenceLine(record: OhImmPatientRecord | undefined): VisitEvidenceLine {
  const base = {
    id: "immunizations",
    includeKey: "immunizations" as const,
    label: "Immunizations",
    panel: "immunizations" as const,
  };
  const statuses = record?.statuses ?? [];
  const doses = record?.doses ?? [];
  if (statuses.length === 0 && doses.length === 0) {
    return { ...base, result: "Not recorded", statusLabel: "Not recorded", tone: "muted", available: false };
  }
  const overdue = statuses.filter((row) => row.status === "overdue");
  const due = statuses.filter((row) => row.status === "due");
  const complete = statuses.filter((row) => row.status === "complete" || row.status === "up_to_date").length;
  if (overdue.length > 0) {
    const names = overdue.map((row) => row.vaccine_name ?? row.vaccine_code).filter(Boolean).join(", ");
    return {
      ...base,
      result: names || `${overdue.length} overdue`,
      displayValue: String(overdue.length),
      displayUnit: "overdue",
      statusLabel: `${overdue.length} overdue`,
      tone: "attention",
      available: true,
    };
  }
  if (due.length > 0) {
    const names = due.map((row) => row.vaccine_name ?? row.vaccine_code).filter(Boolean).join(", ");
    return {
      ...base,
      result: names || `${due.length} due`,
      displayValue: String(due.length),
      displayUnit: "due",
      statusLabel: `${due.length} due`,
      tone: "attention",
      available: true,
    };
  }
  return {
    ...base,
    result: "Up to date",
    displayValue: "Up to date",
    displayUnit: complete > 0 ? `${complete} series` : undefined,
    statusLabel: "Up to date",
    tone: "ok",
    available: true,
  };
}

function formatExamType(value: OhExamination["exam_type"]): string | null {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) {
    return null;
  }
  return raw.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function humanize(value: string | null | undefined): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed) {
    return "";
  }
  const spaced = trimmed.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 10) / 10);
}

/** Format a recorded decimal acuity as Snellen (6/6 = 1.0). */
export function decimalToSnellen(decimal: number | null): string {
  if (decimal == null || decimal <= 0) {
    return "";
  }
  const denom = Math.round(6 / decimal);
  return denom > 0 ? `6/${denom}` : "";
}

function snellenToDecimal(value: string): number | null {
  const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if (!match) {
    return num(value);
  }
  const numr = Number(match[1]);
  const denom = Number(match[2]);
  return denom > 0 ? numr / denom : null;
}
