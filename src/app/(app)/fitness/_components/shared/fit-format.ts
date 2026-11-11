export const OVERALL_LABEL: Record<string, string> = {
  fit: "Fit",
  fit_with_restrictions: "Fit with restrictions",
  not_fit: "Not fit",
  unknown: "Not yet known",
  due_soon: "Due soon",
};

/** Maps to ImmStatusBadge tones. */
export const OVERALL_TONE: Record<string, string> = {
  fit: "cleared",
  fit_with_restrictions: "expiring",
  not_fit: "not_cleared",
  unknown: "planned",
};

export const ITEM_LABEL: Record<string, string> = {
  ok: "OK",
  expiring: "Expires soon",
  overdue: "Overdue",
  restricted: "Restricted",
  blocked: "Not fit",
  missing: "Missing",
};

export const ITEM_TONE: Record<string, string> = {
  ok: "cleared",
  expiring: "expiring",
  overdue: "overdue",
  restricted: "expiring",
  blocked: "not_cleared",
  missing: "due",
};

export const SOURCE_LABEL: Record<string, string> = {
  medical: "Medical",
  immunisation: "Vaccinations",
  drug_alcohol: "Drug & alcohol",
  fit_test: "Fit test",
  training: "Training",
  programme: "Health checks",
};

export const SCOPE_LABEL: Record<string, string> = {
  access_cards: "Access cards",
  rosters: "Rosters",
  payroll: "Payroll holds",
  hr_events: "HR events (sick leave, return to work)",
  certificate_events: "Certificate events",
  surveillance_events: "Surveillance due / overdue",
  iod_events: "Injury on duty (SHE)",
  exports: "Data exports (pull)",
  roster_import: "Roster import (push)",
  device_import: "Device results import (push)",
};

export function label(map: Record<string, string>, value: string | null | undefined): string {
  if (!value) return "—";
  return map[value] ?? value.replace(/_/g, " ");
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function errorText(error: unknown, fallback = "Something went wrong. Try again."): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}
