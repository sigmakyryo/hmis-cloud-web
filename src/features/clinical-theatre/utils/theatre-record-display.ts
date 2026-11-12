import type {
  TheatreAirway,
  TheatreAldreteItem,
  TheatreAnaesthesiaTechnique,
  TheatreCaseStatus,
  TheatreConsumableKind,
  TheatreHandoverDestination,
  TheatreRecoveryRecord,
} from "@/features/clinical-theatre/types/clinical-theatre.types";

/** Modified Aldrete score needed to leave recovery (mirrors the API). */
export const ALDRETE_DISCHARGE_THRESHOLD = 9;

export const ANAESTHESIA_TECHNIQUE_LABELS: Record<TheatreAnaesthesiaTechnique, string> = {
  general: "General",
  spinal: "Spinal",
  epidural: "Epidural",
  cse: "Combined spinal-epidural",
  regional: "Regional block",
  local: "Local",
  sedation: "Sedation",
};

export const AIRWAY_LABELS: Record<TheatreAirway, string> = {
  none: "None / natural airway",
  face_mask: "Face mask",
  lma: "Laryngeal mask (LMA)",
  ett: "Endotracheal tube",
  tracheostomy: "Tracheostomy",
};

export const HANDOVER_DESTINATION_LABELS: Record<TheatreHandoverDestination, string> = {
  ward: "Ward",
  home: "Home",
  hdu: "High dependency unit",
  icu: "Intensive care unit",
  other: "Other",
};

export const ALDRETE_ITEM_LABELS: Record<TheatreAldreteItem, string> = {
  activity: "Activity",
  respiration: "Respiration",
  circulation: "Circulation",
  consciousness: "Consciousness",
  oxygen_saturation: "O₂ saturation",
};

export const CONSUMABLE_KIND_LABELS: Record<TheatreConsumableKind, string> = {
  consumable: "Consumable",
  implant: "Implant",
  procedure: "Procedure charge",
};

const ANAESTHESIA_STATUSES: ReadonlySet<TheatreCaseStatus> = new Set([
  "pre_op",
  "in_theatre",
  "sign_out",
  "recovery",
]);

const OPERATION_NOTE_STATUSES: ReadonlySet<TheatreCaseStatus> = new Set([
  "in_theatre",
  "sign_out",
  "recovery",
  "discharged_ward",
  "discharged_home",
]);

const CONSUMABLE_STATUSES: ReadonlySet<TheatreCaseStatus> = new Set([
  "in_theatre",
  "sign_out",
  "recovery",
]);

/** Whether a record can still be edited for the case status (and is unsigned). */
export function isAnaesthesiaEditable(
  status: TheatreCaseStatus,
  signedAt: string | null | undefined,
): boolean {
  return ANAESTHESIA_STATUSES.has(status) && !signedAt;
}

export function isOperationNoteEditable(
  status: TheatreCaseStatus,
  signedAt: string | null | undefined,
): boolean {
  return OPERATION_NOTE_STATUSES.has(status) && !signedAt;
}

export function areConsumablesEditable(status: TheatreCaseStatus): boolean {
  return CONSUMABLE_STATUSES.has(status);
}

/** Issued stock can still be returned after the patient leaves theatre. */
const RETURN_STATUSES: ReadonlySet<TheatreCaseStatus> = new Set([
  ...CONSUMABLE_STATUSES,
  "discharged_ward",
  "discharged_home",
]);

export function areReturnsAllowed(status: TheatreCaseStatus): boolean {
  return RETURN_STATUSES.has(status);
}

/** Quantity of an issued item that can still go back to stock. */
export function returnableQuantity(item: {
  status: string;
  quantity: string;
  returned_quantity?: string;
  returnable_quantity?: string;
}): number {
  if (item.status !== "issued") return 0;
  if (item.returnable_quantity !== undefined) return Number(item.returnable_quantity);
  return Math.max(Number(item.quantity) - Number(item.returned_quantity ?? 0), 0);
}

/** Validation message for a stock return, or null when valid. */
export function stockReturnError(
  available: number,
  quantity: string,
  reason: string,
  batchSplit?: { quantity: string }[],
): string | null {
  const amount = Number(quantity);
  if (!(amount > 0)) return "Enter a quantity greater than zero.";
  if (amount > available) return `Only ${available} can be returned.`;
  if (!reason.trim()) return "Give a reason for the return.";
  if (batchSplit && batchSplit.length > 1) {
    const total = batchSplit.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);
    if (Math.abs(total - amount) > 1e-9) return "Batch quantities must add up to the return.";
  }
  return null;
}

/** Sum of the five Aldrete items (each 0–2). */
export function aldreteTotal(
  scores: Partial<Record<TheatreAldreteItem, number>>,
): number {
  return (
    (scores.activity ?? 0) +
    (scores.respiration ?? 0) +
    (scores.circulation ?? 0) +
    (scores.consciousness ?? 0) +
    (scores.oxygen_saturation ?? 0)
  );
}

/** Why the patient cannot be discharged from recovery yet, or null when ready. */
export function recoveryDischargeBlocker(
  record: Pick<
    TheatreRecoveryRecord,
    "handover_destination" | "latest_aldrete" | "discharged_at"
  > | null,
): string | null {
  if (!record) return "The recovery record opens when the patient arrives in recovery.";
  if (record.discharged_at) return null;
  if (!record.handover_destination) return "Choose the handover destination.";
  if (record.latest_aldrete === null) return "Record a recovery observation.";
  if (record.latest_aldrete < ALDRETE_DISCHARGE_THRESHOLD) {
    return `Latest Aldrete score is ${record.latest_aldrete}; ${ALDRETE_DISCHARGE_THRESHOLD} or more is needed.`;
  }
  return null;
}

/** Case discharge status that fits the recovery handover destination. */
export function dischargeStatusFor(
  destination: TheatreHandoverDestination | "",
): TheatreCaseStatus | null {
  if (!destination) return null;
  return destination === "home" ? "discharged_home" : "discharged_ward";
}

/** "1 h 36 min" style duration from minutes. */
export function formatMinutes(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || Number.isNaN(minutes)) return "—";
  const rounded = Math.round(minutes);
  const hours = Math.floor(rounded / 60);
  const rest = rounded % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

/** Parse a numeric input; empty or invalid gives null. */
export function parseOptionalNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** ISO timestamp to a `datetime-local` input value in local time. */
export function isoToLocalInput(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

/** Unique clinics (by uuid, sorted by name) from the theatre rooms list. */
export function theatreClinicOptions(
  rooms: { clinic_uuid: string; clinic_name: string }[],
): { uuid: string; name: string }[] {
  const byUuid = new Map<string, string>();
  for (const room of rooms) {
    if (room.clinic_uuid && !byUuid.has(room.clinic_uuid)) {
      byUuid.set(room.clinic_uuid, room.clinic_name || room.clinic_uuid);
    }
  }
  return [...byUuid.entries()]
    .map(([uuid, name]) => ({ uuid, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
