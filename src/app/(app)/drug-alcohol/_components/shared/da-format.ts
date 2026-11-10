import { BffError } from "@/lib/bff-client";

export const REASON_LABEL: Record<string, string> = {
  pre_employment: "Pre-employment",
  random: "Random",
  post_incident: "After an incident",
  reasonable_suspicion: "Reasonable suspicion",
  return_to_duty: "Return to duty",
  follow_up: "Follow-up",
  periodic: "Periodic",
  voluntary: "Voluntary",
};

export const TEST_STATUS_LABEL: Record<string, string> = {
  scheduled: "Booked",
  in_collection: "Collecting",
  awaiting_alcohol_confirm: "Waiting to confirm alcohol",
  awaiting_lab: "At the lab",
  mro_review: "Medical review",
  verified: "Finished",
  cancelled: "Cancelled",
};

export const FITNESS_LABEL: Record<string, string> = {
  fit: "Fit for duty",
  not_fit: "Not fit for safety-critical work",
  restricted: "Stood down for now",
  pending: "Waiting",
  rtd_required: "Return-to-duty needed",
  rtd_pending: "Return-to-duty in progress",
  clear: "Clear",
};

export const SPECIMEN_LABEL: Record<string, string> = {
  urine: "Urine",
  oral_fluid: "Saliva",
  breath: "Breath alcohol",
  hair: "Hair",
  blood: "Blood",
};

export const REFUSAL_LABEL: Record<string, string> = {
  refused_to_test: "Refused to test",
  failed_to_appear: "Did not turn up in time",
  left_before_complete: "Left before the test was finished",
  failed_observed: "Would not allow an observed collection",
  insufficient_no_medical: "Not enough specimen and no medical reason",
  refused_to_sign_alcohol: "Would not sign the alcohol form",
  obstructive_behaviour: "Obstructed the test",
  admitted_adulteration: "Admitted tampering with the specimen",
  other: "Other",
};

export const VERIFICATION_LABEL: Record<string, string> = {
  negative: "Negative",
  positive: "Positive",
  dilute_negative: "Negative (dilute)",
  dilute_positive: "Positive (dilute)",
  refusal_adulterated: "Refusal - tampered specimen",
  refusal_substituted: "Refusal - substituted specimen",
  invalid: "Invalid result",
  cancelled: "Cancel the test",
};

export const DUE_KIND_LABEL: Record<string, string> = {
  random: "Random",
  follow_up: "Follow-up",
  rtd_test: "Return to duty",
  sap: "Counsellor",
  alcohol_confirm: "Alcohol wait",
  shy: "Shy protocol",
  retest: "Retest",
  lab_overdue: "Late lab",
  restricted: "Stood down",
  mro: "Medical review",
};

export function label(map: Record<string, string>, value: string | null | undefined): string {
  if (!value) return "—";
  return map[value] ?? value.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function errorText(error: unknown, fallback = "Something went wrong. Try again."): string {
  if (error instanceof BffError && error.message) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function isForbidden(error: unknown): boolean {
  return error instanceof BffError && error.status === 403;
}

/** Minutes:seconds left until `iso`, or null when passed. */
export function countdown(iso: string | null | undefined, now: number): string | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - now;
  if (Number.isNaN(ms) || ms <= 0) return null;
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}:${String(s).padStart(2, "0")}`;
}
