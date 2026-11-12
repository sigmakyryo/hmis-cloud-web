import type { StatusDotBadgeTone } from "@/components/ui/status-dot-badge";
import type { TheatreConsumable } from "@/features/clinical-theatre/types/clinical-theatre.types";
import type {
  TheatreCountCategory,
  TheatreCountItem,
  TheatreCountPhase,
  TheatreCountSheet,
  TheatreCountXRay,
  TheatreCycleBrief,
  TheatreImplantRecallFilters,
  TheatreIndicatorResult,
  TheatreSterilisationMethod,
  TheatreTrayStatus,
} from "@/features/clinical-theatre/types/theatre-cssd.types";

export const STERILISATION_METHODS: {
  value: TheatreSterilisationMethod;
  label: string;
}[] = [
  { value: "steam", label: "Steam (autoclave)" },
  { value: "eto", label: "Ethylene oxide" },
  { value: "plasma", label: "Hydrogen peroxide plasma" },
  { value: "dry_heat", label: "Dry heat" },
  { value: "low_temp_steam", label: "Low-temperature steam formaldehyde" },
  { value: "other", label: "Other" },
];

export const TRAY_STATUS_LABELS: Record<TheatreTrayStatus, string> = {
  available: "Available (sterile)",
  in_use: "In use",
  awaiting_reprocessing: "Awaiting reprocessing",
  in_sterilisation: "In sterilisation",
  quarantined: "Quarantined",
};

export const TRAY_STATUS_TONE: Record<TheatreTrayStatus, StatusDotBadgeTone> = {
  available: "success",
  in_use: "primary",
  awaiting_reprocessing: "warning",
  in_sterilisation: "info",
  quarantined: "danger",
};

export const INDICATOR_LABELS: Record<TheatreIndicatorResult, string> = {
  pending: "Pending",
  pass: "Pass",
  fail: "Fail",
  not_used: "Not used",
};

export const INDICATOR_TONE: Record<
  TheatreIndicatorResult,
  StatusDotBadgeTone
> = {
  pending: "warning",
  pass: "success",
  fail: "danger",
  not_used: "neutral",
};

export const COUNT_PHASES: { value: TheatreCountPhase; label: string }[] = [
  { value: "initial", label: "Initial count" },
  { value: "first", label: "First count" },
  { value: "closing", label: "Closing count" },
  { value: "final", label: "Final count" },
];

export const COUNT_CATEGORIES: {
  value: TheatreCountCategory;
  label: string;
}[] = [
  { value: "swab", label: "Swabs / sponges" },
  { value: "sharp", label: "Needles / sharps" },
  { value: "instrument", label: "Instruments" },
  { value: "other", label: "Other" },
];

export const XRAY_OPTIONS: { value: TheatreCountXRay; label: string }[] = [
  { value: "negative", label: "Done - no item seen" },
  { value: "positive", label: "Done - item seen" },
  { value: "not_done", label: "Not done" },
  { value: "not_indicated", label: "Not indicated" },
];

export const IMPLANT_LATERALITIES = [
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
  { value: "bilateral", label: "Bilateral" },
  { value: "midline", label: "Midline" },
  { value: "not_applicable", label: "Not applicable" },
] as const;

const PHASE_FIELD: Record<
  Exclude<TheatreCountPhase, "initial">,
  keyof TheatreCountItem
> = {
  first: "first_count",
  closing: "closing_count",
  final: "final_count",
};

/** Count recorded for ``phase`` on a line (initial = the starting number). */
export function phaseValue(
  item: TheatreCountItem,
  phase: TheatreCountPhase,
): number | null {
  if (phase === "initial") return item.initial;
  return item[PHASE_FIELD[phase]] as number | null;
}

/** Lines whose phase count is entered but does not match initial + added. */
export function countMismatches(
  items: TheatreCountItem[],
  phase: TheatreCountPhase,
): TheatreCountItem[] {
  if (phase === "initial") return [];
  return items.filter((item) => {
    const value = phaseValue(item, phase);
    return value !== null && value !== item.expected;
  });
}

export function confirmedPhases(
  sheet: TheatreCountSheet | null,
): Set<TheatreCountPhase> {
  return new Set((sheet?.confirmations ?? []).map((row) => row.phase));
}

/** Why ``phase`` cannot be confirmed yet ("" when it can). */
export function confirmBlocker(
  sheet: TheatreCountSheet | null,
  phase: TheatreCountPhase,
): string {
  if (!sheet) return "Start the count sheet first.";
  if (sheet.status === "reconciled" || sheet.status === "resolved") {
    return "The final count is closed.";
  }
  if (sheet.items.length === 0)
    return "Add the swabs, sharps and instruments first.";
  const done = confirmedPhases(sheet);
  if (phase === "initial") {
    return done.has("initial") ? "The initial count is already confirmed." : "";
  }
  if (!done.has("initial")) return "Confirm the initial count first.";
  const missing = sheet.items.filter(
    (item) => phaseValue(item, phase) === null,
  );
  return missing.length
    ? `Enter a number for every line (${missing.length} missing).`
    : "";
}

/** True when the date (YYYY-MM-DD) is before today (local). */
export function isPastDate(
  value: string | null | undefined,
  today: string,
): boolean {
  return Boolean(value && value < today);
}

export function cycleLabel(cycle: TheatreCycleBrief | null): string {
  if (!cycle) return "No sterilisation record";
  const load = cycle.load_number ? ` · load ${cycle.load_number}` : "";
  return `${cycle.steriliser_name} cycle ${cycle.cycle_number}${load}`;
}

export function recallFiltersEmpty(
  filters: TheatreImplantRecallFilters,
): boolean {
  return !Object.values(filters).some((value) =>
    Boolean(value && String(value).trim()),
  );
}

/** Implants recorded on a case (not cancelled), for summary and op note. */
export function caseImplants(items: TheatreConsumable[]): TheatreConsumable[] {
  return items.filter(
    (item) => item.kind === "implant" && item.status !== "cancelled",
  );
}

/** "Locking plate · Lot L-77 · SN 1 · Left tibia (left) · exp 2027-01-01". */
export function implantSummary(item: TheatreConsumable): string {
  const site = [
    item.implant_site,
    item.implant_laterality && item.implant_laterality !== "not_applicable"
      ? `(${item.implant_laterality})`
      : "",
  ]
    .filter(Boolean)
    .join(" ");
  return [
    item.product_name,
    item.manufacturer,
    item.lot_number && `Lot ${item.lot_number}`,
    item.serial_number && `SN ${item.serial_number}`,
    site,
    item.expiry_date && `exp ${item.expiry_date}`,
    Number(item.quantity) !== 1 ? `x${Number(item.quantity)}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Why an implant cannot be added yet ("" when it can). */
export function implantDraftProblem(
  draft: { lot_number?: string; serial_number?: string; expiry_date?: string },
  batch: { batch_number: string; is_expired: boolean } | null,
  today: string,
): string {
  if (batch?.is_expired)
    return `Batch ${batch.batch_number} has expired; do not implant it.`;
  if (isPastDate(draft.expiry_date, today))
    return "This implant has expired; do not implant it.";
  if (!batch && !draft.lot_number?.trim() && !draft.serial_number?.trim()) {
    return "Record the lot / batch or serial number.";
  }
  return "";
}
