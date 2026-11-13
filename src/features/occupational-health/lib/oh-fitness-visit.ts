import { SOURCE_LABEL } from "@/app/(app)/fitness/_components/shared/fit-format";
import { FIT_SOURCES, STATUS_HINT, daysUntil, groupBySource, worstStatus } from "@/app/(app)/fitness/_components/shared/fit-visual";
import type { OhEncounterPanelId } from "@/features/occupational-health/lib/oh-encounter-modules";
import type {
  FitItemStatus,
  FitSource,
  FitWorker,
} from "@/features/occupational-health/services/fitness.service";
import type { FitnessCertificate } from "@/features/occupational-health/types";
import { currentFitnessCertificate, isCertificateInForce } from "@/features/occupational-health/utils/oh-format";

/** Checklist badge copy: Done / Missing / Expired / Flagged, plus the two in-date warnings. */
export const CHECKLIST_BADGE: Record<FitItemStatus, string> = {
  ok: "Done",
  missing: "Missing",
  overdue: "Expired",
  blocked: "Flagged",
  expiring: "Expires soon",
  restricted: "Restricted",
};

/** ImmStatusBadge tone keys. */
export const CHECKLIST_BADGE_TONE: Record<FitItemStatus, string> = {
  ok: "cleared",
  missing: "not_done",
  overdue: "expired",
  blocked: "not_cleared",
  expiring: "expiring",
  restricted: "conditional",
};

export const VERDICT_BADGE_TONE: Record<string, string> = {
  fit: "cleared",
  fit_with_restrictions: "expiring",
  not_fit: "not_cleared",
  unknown: "planned",
};

export type FitSourceNav = {
  panel?: OhEncounterPanelId;
  href?: "fitnessBoard" | "fitnessTraining";
  label: string;
};

/** Where a readiness row jumps: a visit panel, or the fitness board / training pages. */
export const FIT_SOURCE_NAV: Record<FitSource, FitSourceNav> = {
  medical: { panel: "medical-examinations", label: "Exam" },
  immunisation: { panel: "immunizations", label: "Immunizations" },
  drug_alcohol: { panel: "drug-alcohol", label: "D&A" },
  programme: { panel: "health-checks", label: "Checks" },
  fit_test: { href: "fitnessBoard", label: "Board" },
  training: { href: "fitnessTraining", label: "Training" },
};

export type FitChecklistRow = {
  source: FitSource;
  label: string;
  status: FitItemStatus;
  badge: string;
  badgeTone: string;
  detail: string;
  expiresOn: string | null;
  extraCount: number;
  isBlocker: boolean;
  nav: FitSourceNav;
};

/** One row per fit source, worst status first, blockers flagged from `reasons`. */
export function fitVisitChecklist(worker: FitWorker): FitChecklistRow[] {
  const bySource = groupBySource(worker.items);
  const blockerSources = new Set(worker.reasons.map((reason) => reason.source));
  return FIT_SOURCES.map((source) => {
    const items = bySource.get(source) ?? [];
    const status = worstStatus(items) ?? "missing";
    const worst = items.find((item) => item.status === status) ?? items[0];
    const reason = worker.reasons.find((item) => item.source === source);
    const detail = reason?.message ?? worst?.message ?? STATUS_HINT[status];
    return {
      source,
      label: SOURCE_LABEL[source] ?? source,
      status,
      badge: CHECKLIST_BADGE[status],
      badgeTone: CHECKLIST_BADGE_TONE[status],
      detail,
      expiresOn: worst?.expires_on ?? null,
      extraCount: Math.max(0, items.length - 1),
      isBlocker: blockerSources.has(source),
      nav: FIT_SOURCE_NAV[source],
    };
  });
}

export function checklistProgress(rows: FitChecklistRow[]): { done: number; flagged: number; total: number } {
  const done = rows.filter((row) => row.status === "ok").length;
  const flagged = rows.filter((row) => row.isBlocker || row.status === "blocked" || row.status === "overdue").length;
  return { done, flagged, total: rows.length };
}

export type FitVisitAction = {
  key: "issue" | "exam" | "renew" | "board";
  label: string;
  panel?: OhEncounterPanelId;
  href?: "fitnessBoard";
};

const MEDICAL_NEEDS_WORK: FitItemStatus[] = ["missing", "blocked", "overdue"];

/** Days at or below this, a certificate or medical in force is treated as due to renew. */
export const RENEW_WITHIN_DAYS = 60;

/**
 * One primary next step from the worker's status and any certificate in force.
 * Medical gaps go to the exam; an in-date fit result without a certificate goes to issue;
 * an in-force certificate near expiry goes to renew.
 */
export function fitVisitPrimaryAction(
  worker: FitWorker,
  certificates: FitnessCertificate[],
  now: Date = new Date(),
): FitVisitAction | null {
  const medicalItems = worker.items.filter((item) => item.source === "medical");
  const medical = worstStatus(medicalItems);
  const medicalMissing = medical === null || MEDICAL_NEEDS_WORK.includes(medical);
  const cleared = worker.overall === "fit" || worker.overall === "fit_with_restrictions";

  if (medicalMissing && !cleared) {
    return { key: "exam", label: "Go to exam", panel: "medical-examinations" };
  }

  const current = currentFitnessCertificate(certificates);
  const validTo = current?.valid_to ?? null;
  const certDays = validTo ? daysUntil(validTo, now) : null;
  const certDue = current !== null && certDays !== null && certDays <= RENEW_WITHIN_DAYS;
  const medicalExpiring = medical === "expiring";

  if (current && isCertificateInForce(current) && (certDue || medicalExpiring)) {
    return { key: "renew", label: "Renew", panel: "certificate" };
  }

  if (!current && cleared) {
    return { key: "issue", label: "Issue certificate", panel: "certificate" };
  }

  return null;
}

/** Secondary short actions that are not already the primary. Fitness board is always last. */
export function fitVisitSecondaryActions(primary: FitVisitAction | null): FitVisitAction[] {
  const actions: FitVisitAction[] = [];
  if (primary?.key !== "issue") {
    actions.push({ key: "issue", label: "Issue certificate", panel: "certificate" });
  }
  if (primary?.key !== "exam") {
    actions.push({ key: "exam", label: "Go to exam", panel: "medical-examinations" });
  }
  actions.push({ key: "board", label: "Fitness board", href: "fitnessBoard" });
  return actions;
}

export { currentFitnessCertificate };
