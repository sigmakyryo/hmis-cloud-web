import { SOURCE_LABEL } from "@/app/(app)/fitness/_components/shared/fit-format";
import {
  FIT_SOURCES,
  STATUS_HINT,
  daysUntil,
  groupBySource,
  worstStatus,
} from "@/app/(app)/fitness/_components/shared/fit-visual";
import type { OhEncounterPanelId } from "@/features/occupational-health/lib/oh-encounter-modules";
import type {
  FitItem,
  FitItemStatus,
  FitOverall,
  FitSource,
  FitWorker,
} from "@/features/occupational-health/services/fitness.service";
import type { FitnessCertificate } from "@/features/occupational-health/types";
import {
  currentFitnessCertificate,
  isCertificateInForce,
} from "@/features/occupational-health/utils/oh-format";

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

/** Action copy for the assessment dashboard cards. */
export const FIT_SOURCE_ACTION: Record<
  FitSource,
  { incomplete: string; complete: string; external?: boolean }
> = {
  medical: { incomplete: "Record exam", complete: "View" },
  immunisation: { incomplete: "Record immunizations", complete: "View" },
  drug_alcohol: { incomplete: "Add result", complete: "View" },
  programme: { incomplete: "Record checks", complete: "View" },
  fit_test: {
    incomplete: "Open fit-test board",
    complete: "Open fit-test board",
    external: true,
  },
  training: {
    incomplete: "Open training system",
    complete: "Open training system",
    external: true,
  },
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
  items: FitItem[];
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
      items,
    };
  });
}

export function checklistProgress(rows: FitChecklistRow[]): {
  done: number;
  flagged: number;
  total: number;
} {
  const done = rows.filter((row) => row.status === "ok").length;
  const flagged = rows.filter(
    (row) => row.isBlocker || row.status === "blocked" || row.status === "overdue",
  ).length;
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

/** Dashboard status vocabulary shown on requirement cards. */
export type FitAssessmentUiStatus =
  | "blocking"
  | "required"
  | "optional"
  | "completed"
  | "locked"
  | "expired"
  | "not_applicable";

export type FitAssessmentGroup = "needs_attention" | "locked" | "completed";

export type FitAssessmentCardKind =
  | "source"
  | "pre_employment"
  | "iod"
  | "certificate";

export type FitAssessmentCard = {
  id: string;
  kind: FitAssessmentCardKind;
  group: FitAssessmentGroup;
  title: string;
  description: string;
  uiStatus: FitAssessmentUiStatus;
  badgeLabel: string;
  source?: FitSource;
  status?: FitItemStatus | string;
  isBlocker: boolean;
  expiresOn: string | null;
  extraCount: number;
  items: FitItem[];
  nav: FitSourceNav | null;
  actionLabel: string;
  actionDisabled: boolean;
  actionPrimary: boolean;
  actionExternal: boolean;
};

export type FitAssessmentSummary = {
  overall: FitOverall;
  decisionLabel: string;
  headline: string;
  explanation: string;
  blockingLabels: string[];
  progress: { done: number; total: number; flagged: number };
  cta: {
    label: string;
    panel?: OhEncounterPanelId;
    href?: "fitnessBoard" | "fitnessTraining";
  } | null;
};

export type FitAssessmentModel = {
  summary: FitAssessmentSummary;
  needsAttention: FitAssessmentCard[];
  locked: FitAssessmentCard[];
  completed: FitAssessmentCard[];
};

export type PreEmploymentAssessmentInput = {
  status: "not_started" | "in_progress" | "submitted" | "uploaded";
  submittedAt?: string | null;
  documentName?: string | null;
};

export type IodAssessmentInput = {
  status: string | null;
};

const DECISION_LABEL: Record<FitOverall, string> = {
  fit: "Fit for duty",
  fit_with_restrictions: "Fit with restrictions",
  not_fit: "Not fit",
  unknown: "Decision pending",
};

const CTA_SOURCE_LABEL: Record<FitSource, string> = {
  medical: "Record medical exam",
  immunisation: "Record vaccinations",
  drug_alcohol: "Add drug & alcohol result",
  fit_test: "Open fit-test board",
  training: "Open training system",
  programme: "Record health checks",
};

function humanizeSource(source: FitSource): string {
  return SOURCE_LABEL[source] ?? source.replace(/_/g, " ");
}

function sourceUiStatus(row: FitChecklistRow, overall: FitOverall): FitAssessmentUiStatus {
  if (row.status === "ok") return "completed";
  if (row.status === "overdue") return "expired";
  if (row.isBlocker) return "blocking";
  // Without an API reason list, a missing/overdue medical still blocks clearance.
  if (
    row.source === "medical" &&
    MEDICAL_NEEDS_WORK.includes(row.status) &&
    (overall === "unknown" || overall === "not_fit")
  ) {
    return "blocking";
  }
  return "required";
}

function sourceBadge(uiStatus: FitAssessmentUiStatus, row: FitChecklistRow): string {
  if (uiStatus === "blocking") return "Blocking";
  if (uiStatus === "expired") return "Expired";
  if (uiStatus === "completed") return "Done";
  if (row.status === "expiring") return "Expires soon";
  if (row.status === "restricted") return "Restricted";
  return "Required";
}

function sourceDescription(row: FitChecklistRow, uiStatus: FitAssessmentUiStatus): string {
  if (row.status === "ok") {
    const validity = row.expiresOn ? `valid until ${row.expiresOn}` : null;
    return [row.detail, validity].filter(Boolean).join(" · ");
  }
  if (uiStatus === "blocking") {
    return `Required before a decision · ${row.detail}`;
  }
  return row.detail;
}

function sourceCard(row: FitChecklistRow, overall: FitOverall): FitAssessmentCard {
  const uiStatus = sourceUiStatus(row, overall);
  const completed = uiStatus === "completed";
  const action = FIT_SOURCE_ACTION[row.source];
  const isBlocker = row.isBlocker || uiStatus === "blocking";
  return {
    id: `source:${row.source}`,
    kind: "source",
    group: completed ? "completed" : "needs_attention",
    title: row.label,
    description: sourceDescription(row, uiStatus),
    uiStatus,
    badgeLabel: sourceBadge(uiStatus, row),
    source: row.source,
    status: row.status,
    isBlocker,
    expiresOn: row.expiresOn,
    extraCount: row.extraCount,
    items: row.items,
    nav: {
      ...row.nav,
      label: completed ? action.complete : action.incomplete,
    },
    actionLabel: completed ? action.complete : action.incomplete,
    actionDisabled: false,
    actionPrimary: uiStatus === "blocking",
    actionExternal: Boolean(action.external),
  };
}

function preEmploymentCard(
  record: PreEmploymentAssessmentInput,
): FitAssessmentCard {
  const done = record.status === "submitted" || record.status === "uploaded";
  let description = "No form recorded on this visit";
  if (record.status === "in_progress") description = "Started, not submitted";
  if (record.status === "submitted" && record.submittedAt) {
    description = `Submitted ${record.submittedAt}`;
  } else if (record.status === "submitted") {
    description = "Submitted on this visit";
  }
  if (record.status === "uploaded") {
    description = record.documentName?.trim() || "Document uploaded";
  }
  return {
    id: "pre_employment",
    kind: "pre_employment",
    group: done ? "completed" : "needs_attention",
    title: "Pre-employment form",
    description,
    uiStatus: done ? "completed" : "optional",
    badgeLabel: done ? "Done" : "Optional",
    isBlocker: false,
    expiresOn: null,
    extraCount: 0,
    items: [],
    nav: null,
    actionLabel: done ? "View" : record.status === "in_progress" ? "Continue form" : "Start form",
    actionDisabled: false,
    actionPrimary: false,
    actionExternal: false,
  };
}

function humanizeStatus(value: string): string {
  const normalized = value.replace(/_/g, " ").trim();
  if (!normalized) return "";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function iodCard(record: IodAssessmentInput): FitAssessmentCard {
  const recorded = Boolean(record.status?.trim());
  return {
    id: "iod",
    kind: "iod",
    group: recorded ? "completed" : "needs_attention",
    title: "Injury on duty",
    description: recorded
      ? humanizeStatus(record.status ?? "")
      : "Open to record the injury.",
    uiStatus: recorded ? "completed" : "optional",
    badgeLabel: recorded ? "Recorded" : "Not started",
    status: recorded ? "recorded" : "not_started",
    isBlocker: false,
    expiresOn: null,
    extraCount: 0,
    items: [],
    nav: { panel: "injuries", label: recorded ? "View" : "Open" },
    actionLabel: recorded ? "View" : "Open",
    actionDisabled: false,
    actionPrimary: false,
    actionExternal: false,
  };
}

function certificateCard(
  current: FitnessCertificate | null,
  locked: boolean,
): FitAssessmentCard {
  if (current) {
    return {
      id: "certificate",
      kind: "certificate",
      group: "completed",
      title: "Certificate of fitness",
      description: `Issued${current.version ? ` · v${current.version}` : ""}`,
      uiStatus: "completed",
      badgeLabel: "Issued",
      status: current.status,
      isBlocker: false,
      expiresOn: current.valid_to,
      extraCount: 0,
      items: [],
      nav: { panel: "certificate", label: "Open certificate" },
      actionLabel: "Open certificate",
      actionDisabled: false,
      actionPrimary: false,
      actionExternal: false,
    };
  }

  if (locked) {
    return {
      id: "certificate",
      kind: "certificate",
      group: "locked",
      title: "Certificate of fitness",
      description: "Available once all required items are complete",
      uiStatus: "locked",
      badgeLabel: "Locked",
      status: "locked",
      isBlocker: false,
      expiresOn: null,
      extraCount: 0,
      items: [],
      nav: { panel: "certificate", label: "Open certificate" },
      actionLabel: "Open certificate",
      actionDisabled: true,
      actionPrimary: false,
      actionExternal: false,
    };
  }

  return {
    id: "certificate",
    kind: "certificate",
    group: "needs_attention",
    title: "Certificate of fitness",
    description: "Required items are complete · Ready to issue",
    uiStatus: "required",
    badgeLabel: "Required",
    status: "not_started",
    isBlocker: false,
    expiresOn: null,
    extraCount: 0,
    items: [],
    nav: { panel: "certificate", label: "Issue certificate" },
    actionLabel: "Issue certificate",
    actionDisabled: false,
    actionPrimary: true,
    actionExternal: false,
  };
}

function pickSummaryCta(
  cards: FitAssessmentCard[],
  overall: FitOverall,
  current: FitnessCertificate | null,
): FitAssessmentSummary["cta"] {
  const needs = cards.filter((card) => card.group === "needs_attention" && !card.actionDisabled);

  const medical = needs.find((card) => card.source === "medical");
  if (medical?.nav) {
    return {
      label: `${CTA_SOURCE_LABEL.medical} →`,
      panel: medical.nav.panel,
      href: medical.nav.href,
    };
  }

  const blocker = needs.find((card) => card.isBlocker && card.nav);
  if (blocker?.nav) {
    const label = blocker.source
      ? `${CTA_SOURCE_LABEL[blocker.source]} →`
      : `${blocker.actionLabel} →`;
    return { label, panel: blocker.nav.panel, href: blocker.nav.href };
  }

  const firstRequired = needs.find(
    (card) =>
      (card.uiStatus === "required" || card.uiStatus === "expired" || card.uiStatus === "blocking") &&
      card.nav,
  );
  if (firstRequired?.nav) {
    const label = firstRequired.source
      ? `${CTA_SOURCE_LABEL[firstRequired.source]} →`
      : `${firstRequired.actionLabel} →`;
    return { label, panel: firstRequired.nav.panel, href: firstRequired.nav.href };
  }

  const certCard = needs.find((card) => card.kind === "certificate");
  if (certCard?.nav) {
    return { label: `${certCard.actionLabel} →`, panel: certCard.nav.panel };
  }

  if (current) {
    return { label: "Open certificate →", panel: "certificate" };
  }

  if (overall === "fit" || overall === "fit_with_restrictions") {
    return { label: "Issue certificate →", panel: "certificate" };
  }

  return null;
}

/**
 * Decision-oriented assessment model: summary + Needs Attention / Locked / Completed.
 * Required progress uses the six fit sources only (same as checklistProgress).
 */
export function buildFitAssessment(input: {
  worker: FitWorker;
  certificates: FitnessCertificate[];
  preEmployment?: PreEmploymentAssessmentInput | null;
  iod?: IodAssessmentInput | null;
  now?: Date;
}): FitAssessmentModel {
  const rows = fitVisitChecklist(input.worker);
  const progress = checklistProgress(rows);
  const current = currentFitnessCertificate(input.certificates);
  const requiredComplete = progress.total === 0 || progress.done === progress.total;
  const cleared =
    input.worker.overall === "fit" || input.worker.overall === "fit_with_restrictions";
  const certificateLocked = !current && !(requiredComplete && cleared);

  const overall: FitOverall =
    input.worker.overall === "fit" ||
    input.worker.overall === "fit_with_restrictions" ||
    input.worker.overall === "not_fit" ||
    input.worker.overall === "unknown"
      ? input.worker.overall
      : "unknown";

  const cards: FitAssessmentCard[] = [
    ...rows.map((row) => sourceCard(row, overall)),
    ...(input.preEmployment ? [preEmploymentCard(input.preEmployment)] : []),
    ...(input.iod ? [iodCard(input.iod)] : []),
    certificateCard(current, certificateLocked),
  ];

  const outstanding = rows.filter((row) => row.status !== "ok");
  const blockingCards = cards.filter(
    (card) => card.kind === "source" && card.group === "needs_attention" && card.isBlocker,
  );
  const blockingLabels = (
    blockingCards.length > 0
      ? blockingCards
      : outstanding.map((row) => sourceCard(row, overall))
  ).map((card) => (card.source ? humanizeSource(card.source) : card.title).toLowerCase());
  let headline: string;
  let explanation: string;
  if (outstanding.length > 0) {
    headline = `${outstanding.length} required item${outstanding.length === 1 ? "" : "s"} outstanding`;
    explanation =
      overall === "fit" || overall === "fit_with_restrictions"
        ? `Some required items still need attention. Outstanding: ${blockingLabels.join(", ")}.`
        : `Fitness can't be decided yet. Blocking: ${blockingLabels.join(", ")}.`;
  } else if (current) {
    headline = "All required items complete";
    explanation =
      overall === "fit_with_restrictions"
        ? "Cleared with restrictions. Certificate is on file."
        : "Fitness decided. Certificate is on file.";
  } else if (cleared) {
    headline = "Ready to issue certificate";
    explanation = "All required items are complete. Issue the certificate of fitness.";
  } else {
    headline = "All required items complete";
    explanation = "Required checks are on file. Review before deciding fitness.";
  }

  const summary: FitAssessmentSummary = {
    overall,
    decisionLabel: DECISION_LABEL[overall],
    headline,
    explanation,
    blockingLabels,
    progress: {
      done: progress.done,
      total: progress.total,
      flagged: progress.flagged,
    },
    cta: pickSummaryCta(cards, overall, current),
  };

  const byGroup = (group: FitAssessmentGroup) =>
    cards.filter((card) => card.group === group);

  return {
    summary,
    needsAttention: byGroup("needs_attention"),
    locked: byGroup("locked"),
    completed: byGroup("completed"),
  };
}

export { currentFitnessCertificate };
