import type {
  TheatreBaby,
  TheatreBabyDestination,
  TheatreBabyOutcome,
  TheatreBabySex,
  TheatreCaesareanCategory,
  TheatreCase,
  TheatreCaseSource,
  TheatreCaseStatus,
  TheatrePlacentaDelivery,
  TheatreUterineIncision,
} from "@/features/clinical-theatre/types/clinical-theatre.types";

export const CAESAREAN_CATEGORY_OPTIONS: { value: TheatreCaesareanCategory; label: string }[] = [
  { value: "1", label: "Category 1 - immediate threat to life" },
  { value: "2", label: "Category 2 - maternal/fetal compromise" },
  { value: "3", label: "Category 3 - early delivery, no compromise" },
  { value: "4", label: "Category 4 - elective" },
];

export const UTERINE_INCISION_OPTIONS: { value: TheatreUterineIncision; label: string }[] = [
  { value: "lower_segment", label: "Lower segment transverse" },
  { value: "classical", label: "Classical (vertical)" },
  { value: "j_shaped", label: "J / T-shaped extension" },
  { value: "other", label: "Other" },
];

export const PLACENTA_OPTIONS: { value: TheatrePlacentaDelivery; label: string }[] = [
  { value: "complete", label: "Delivered complete" },
  { value: "incomplete", label: "Incomplete" },
  { value: "manual", label: "Manual removal" },
  { value: "retained", label: "Retained / accreta" },
];

export const BABY_SEX_OPTIONS: { value: TheatreBabySex; label: string }[] = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "indeterminate", label: "Indeterminate" },
];

export const BABY_OUTCOME_OPTIONS: { value: TheatreBabyOutcome; label: string }[] = [
  { value: "live_birth", label: "Live birth" },
  { value: "fresh_stillbirth", label: "Fresh stillbirth" },
  { value: "macerated_stillbirth", label: "Macerated stillbirth" },
  { value: "early_neonatal_death", label: "Early neonatal death" },
];

export const BABY_DESTINATION_OPTIONS: { value: TheatreBabyDestination; label: string }[] = [
  { value: "with_mother", label: "With mother" },
  { value: "nursery", label: "Nursery" },
  { value: "nicu", label: "Neonatal unit (NICU)" },
  { value: "other", label: "Other" },
];

/** Matches the API: Apgar below 7 at five minutes is reported as low. */
export const LOW_APGAR_THRESHOLD = 7;
/** Matches the API: under 2.5 kg is low birth weight. */
export const LOW_BIRTH_WEIGHT_G = 2500;

const BABY_STATUSES: TheatreCaseStatus[] = [
  "in_theatre",
  "sign_out",
  "recovery",
  "discharged_ward",
  "discharged_home",
];

const CONVERTIBLE_STATUSES: TheatreCaseStatus[] = [
  "booked",
  "waiting",
  "pre_op",
  "in_theatre",
  "sign_out",
  "recovery",
];

const REGISTRABLE_OUTCOMES: TheatreBabyOutcome[] = ["live_birth", "early_neonatal_death"];

export type ApgarTone = "normal" | "moderate" | "low";

export function apgarTone(score: number | null | undefined): ApgarTone | null {
  if (score === null || score === undefined) return null;
  if (score >= LOW_APGAR_THRESHOLD) return "normal";
  if (score >= 4) return "moderate";
  return "low";
}

export function isLowBirthWeight(grams: number | null | undefined): boolean {
  return grams !== null && grams !== undefined && grams < LOW_BIRTH_WEIGHT_G;
}

export function formatBirthWeight(grams: number | null | undefined): string {
  if (grams === null || grams === undefined) return "—";
  return `${(grams / 1000).toFixed(2)} kg`;
}

export function formatApgar(baby: Pick<TheatreBaby, "apgar_1" | "apgar_5" | "apgar_10">): string {
  const parts = [baby.apgar_1, baby.apgar_5, baby.apgar_10].map((score) =>
    score === null || score === undefined ? "–" : String(score),
  );
  return parts.join(" / ");
}

/** Obstetric details are not offered for male patients (the API refuses them). */
export function isObstetricEligible(theatreCase: Pick<TheatreCase, "customer_gender">): boolean {
  return (theatreCase.customer_gender ?? "").toLowerCase() !== "male";
}

export function isObstetricRecordEditable(status: TheatreCaseStatus): boolean {
  return status !== "cancelled";
}

export function canRecordBabies(status: TheatreCaseStatus): boolean {
  return BABY_STATUSES.includes(status);
}

export function canRegisterBaby(baby: Pick<TheatreBaby, "outcome" | "newborn_uuid">): boolean {
  return REGISTRABLE_OUTCOMES.includes(baby.outcome) && !baby.newborn_uuid;
}

export function canAdmitBaby(
  baby: Pick<TheatreBaby, "outcome" | "newborn_stay_uuid">,
): boolean {
  return baby.outcome === "live_birth" && !baby.newborn_stay_uuid;
}

/** True when a day case (not already an inpatient) can still be admitted. */
export function canConvertToIpd(
  theatreCase: Pick<TheatreCase, "source" | "stay_uuid" | "status">,
): boolean {
  return (
    theatreCase.source !== "ipd_stay" &&
    !theatreCase.stay_uuid &&
    CONVERTIBLE_STATUSES.includes(theatreCase.status)
  );
}

const SOURCE_LABELS: Record<TheatreCaseSource, string> = {
  ipd_stay: "inpatient",
  existing_visit: "visit",
  elective: "day case",
};

export function conversionSummary(
  theatreCase: Pick<
    TheatreCase,
    "converted_to_ipd_at" | "converted_from_source" | "conversion_reason"
  >,
): string | null {
  if (!theatreCase.converted_to_ipd_at) return null;
  const from = theatreCase.converted_from_source
    ? SOURCE_LABELS[theatreCase.converted_from_source]
    : "day case";
  const when = new Date(theatreCase.converted_to_ipd_at).toLocaleString();
  const reason = theatreCase.conversion_reason ? `: ${theatreCase.conversion_reason}` : "";
  return `Converted from ${from} to inpatient on ${when}${reason}`;
}

export function parseOptionalInt(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Client-side check before posting a baby; mirrors the API ranges. */
export function babyFormError(values: {
  birth_weight_g: number | null;
  apgar_1: number | null;
  apgar_5: number | null;
  apgar_10: number | null;
}): string | null {
  if (values.birth_weight_g !== null && (values.birth_weight_g < 200 || values.birth_weight_g > 7000)) {
    return "Birth weight must be between 200 g and 7000 g.";
  }
  for (const score of [values.apgar_1, values.apgar_5, values.apgar_10]) {
    if (score !== null && (score < 0 || score > 10)) {
      return "Apgar scores are between 0 and 10.";
    }
  }
  return null;
}
