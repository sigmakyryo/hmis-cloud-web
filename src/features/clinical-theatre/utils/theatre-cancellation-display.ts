import type {
  TheatreCancellationCategory,
  TheatreCancellationReason,
} from "@/features/clinical-theatre/types/clinical-theatre.types";

export const CANCELLATION_CATEGORY_LABELS: Record<
  TheatreCancellationCategory | "unspecified",
  string
> = {
  patient: "Patient",
  clinical: "Clinical",
  organisational: "Organisational",
  resources: "Resources / equipment",
  other: "Other",
  unspecified: "Unspecified",
};

export const CANCELLATION_CATEGORY_ORDER: TheatreCancellationCategory[] = [
  "patient",
  "clinical",
  "organisational",
  "resources",
  "other",
];

/** Active reasons grouped by category, in category then sort order. */
export function groupCancellationReasons(
  reasons: TheatreCancellationReason[],
): { category: TheatreCancellationCategory; label: string; reasons: TheatreCancellationReason[] }[] {
  return CANCELLATION_CATEGORY_ORDER.map((category) => ({
    category,
    label: CANCELLATION_CATEGORY_LABELS[category],
    reasons: reasons
      .filter((reason) => reason.is_active && reason.category === category)
      .sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label)),
  })).filter((group) => group.reasons.length > 0);
}

/** Validation message for a cancel / postpone form, or null when valid. */
export function cancellationFormError(
  reasons: TheatreCancellationReason[],
  selectedUuid: string,
  note: string,
): string | null {
  const hasStandardList = reasons.some((reason) => reason.is_active);
  if (!hasStandardList) {
    return note.trim() ? null : "Enter a reason.";
  }
  const selected = reasons.find((reason) => reason.uuid === selectedUuid);
  if (!selected) return "Choose a reason.";
  if (selected.requires_note && !note.trim()) return `Add a note for "${selected.label}".`;
  return null;
}
